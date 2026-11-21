#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4048; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqdisp SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B CLOUDINARY_CLOUD_NAME=democloud CLOUDINARY_API_KEY=123456789012345 CLOUDINARY_API_SECRET=fake-secret-value-123
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
rm -rf .next && cp -a .next-pristine .next
(setsid nohup npx next start -p $PORT > /tmp/vhqdisp-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 160 /tmp/body)"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
rm -f /tmp/jm-vhqdisp; code -c /tmp/jm-vhqdisp -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jm-vhqdisp -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
code -b /tmp/jm-vhqdisp -c /tmp/jm-vhqdisp -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)\"}" >/dev/null
CB="-b /tmp/jm-vhqdisp -c /tmp/jm-vhqdisp"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }
fresh(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"; }
iso(){ node -e "console.log(new Date(Date.now()+($1)*1000).toISOString())"; }
pub(){ code $B/api/dispatches"$1" >/dev/null; jq_ "'|'.join(i['title'] for i in d['items'])"; }
page(){ curl -s -m 20 "$B$1" -o /tmp/page-vhqdisp.html; }
has(){ grep -qF -- "$2" /tmp/page-vhqdisp.html && pass "$1" || fail "$1 (missing: $2)"; }
hasnt(){ grep -qF -- "$2" /tmp/page-vhqdisp.html && fail "$1 (found: $2)" || pass "$1"; }
mkd(){ P POST /api/admin/dispatches "$1"; }

echo "== login needed"
expect "no login: list" 401 $(code $B/api/admin/dispatches)
expect "no login: create" 401 $(code -X POST $B/api/admin/dispatches -H "$J" -H "$O" -d '{"title":"x"}')
expect "no login: change" 401 $(code -X PATCH $B/api/admin/dispatches/aaaaaaaaaaaaaaaaaaaaaaaa -H "$J" -H "$O" -d '{"pinned":true}')
expect "no login: delete" 401 $(code -X DELETE $B/api/admin/dispatches/aaaaaaaaaaaaaaaaaaaaaaaa -H "$O")

echo "== public list starts empty, samples appear once the Office opens"
expect "public list is public" 200 $(code $B/api/dispatches); [ "$(pub)" = "" ] && pass "empty at first" || fail "not empty at first"
expect "Office list" 200 $(code $CB $B/api/admin/dispatches)
[ "$(jq_ "len(d['items'])")" = "3" ] && pass "3 samples created" || fail "samples: $(jq_ "len(d['items'])")"
[ "$(jq_ "all(i['isSample'] for i in d['items'])")" = "True" ] && pass "all marked as samples" || fail "samples not marked"
SID=$(jq_ "d['items'][0]['id']")
[ "$(pub | tr '|' '\n' | grep -c '^Sample:')" = "3" ] && pass "visitors see the 3 samples" || fail "public samples: $(pub)"
page /dispatches; has "samples on the page" "Sample: "
expect "editing a sample's words" 200 $(P PATCH /api/admin/dispatches/$SID '{"title":"My own words"}')
[ "$(jq_ "d['item']['isSample']")" = "False" ] && pass "an edited sample stops being a sample" || fail "still a sample"
fresh
for id in $(code $CB $B/api/admin/dispatches >/dev/null; jq_ "' '.join(i['id'] for i in d['items'])"); do expect "delete $id" 200 $(P DELETE /api/admin/dispatches/$id); done
code $CB $B/api/admin/dispatches >/dev/null; [ "$(jq_ "len(d['items'])")" = "0" ] && pass "all gone" || fail "not all gone"
code $CB $B/api/admin/dispatches >/dev/null; [ "$(jq_ "len(d['items'])")" = "0" ] && pass "samples are NOT brought back after deleting them" || fail "samples came back"
[ "$(pub)" = "" ] && pass "public list empty again" || fail "public list: $(pub)"

echo "== validation"
expect "empty title" 400 $(mkd '{"title":""}')
expect "unknown kind" 400 $(mkd '{"title":"a","kind":"blog"}')
expect "bad date" 400 $(mkd '{"title":"a","date":"20/11/2026"}')
expect "image from another site" 400 $(mkd '{"title":"a","imageUrl":"https://evil.example/x.png"}')
expect "video from another site" 400 $(mkd '{"title":"a","video":"https://youtube.com/watch?v=1"}')
expect "text over 600" 400 $(mkd "{\"title\":\"a\",\"text\":\"$(python3 -c "print('x'*601)")\"}")
expect "expires before it starts" 400 $(mkd "{\"title\":\"a\",\"publishAt\":\"$(iso 7200)\",\"expireAt\":\"$(iso 3600)\"}")
expect "not json" 400 $(code $CB -X POST $B/api/admin/dispatches -H "$J" -H "$O" -d 'nope')
expect "nothing to change" 400 $(P PATCH /api/admin/dispatches/aaaaaaaaaaaaaaaaaaaaaaaa '{}')
expect "bad id" 404 $(P PATCH /api/admin/dispatches/zzz '{"pinned":true}')
expect "unknown id" 404 $(P PATCH /api/admin/dispatches/aaaaaaaaaaaaaaaaaaaaaaaa '{"pinned":true}')

echo "== what visitors see: published, started, not expired"
expect "create a published win" 201 $(mkd '{"title":"Real one","text":"It works","kind":"win","published":true}'); ID=$(jq_ "d['item']['id']")
[ "$(jq_ "d['item']['published']")" = "True" ] && pass "created published" || fail "not published"
expect "draft" 201 $(mkd '{"title":"Draft one"}'); DID=$(jq_ "d['item']['id']")
[ "$(jq_ "d['item']['published']")" = "False" ] && pass "default is a draft" || fail "default not a draft"
expect "scheduled for later" 201 $(mkd "{\"title\":\"Later one\",\"published\":true,\"publishAt\":\"$(iso 3600)\"}"); LID=$(jq_ "d['item']['id']")
expect "already expired" 201 $(mkd "{\"title\":\"Old one\",\"published\":true,\"expireAt\":\"$(iso -3600)\"}"); XID=$(jq_ "d['item']['id']")
[ "$(pub)" = "Real one" ] && pass "only the live one is public (no draft, no scheduled, no expired)" || fail "public: $(pub)"
expect "publish the draft" 200 $(P PATCH /api/admin/dispatches/$DID '{"published":true}')
[ "$(pub | tr '|' '\n' | sort | tr '\n' '|')" = "Draft one|Real one|" ] && pass "draft shows right after publishing" || fail "public: $(pub)"
expect "start the scheduled one now" 200 $(P PATCH /api/admin/dispatches/$LID "{\"publishAt\":\"$(iso -10)\"}")
pub | tr '|' '\n' | grep -qx "Later one" && pass "scheduled one shows once its time has come" || fail "scheduled not shown"
expect "un-expire the old one" 200 $(P PATCH /api/admin/dispatches/$XID "{\"expireAt\":\"$(iso 3600)\"}")
pub | tr '|' '\n' | grep -qx "Old one" && pass "shows when its expiry moves to the future" || fail "old one not shown"
expect "expire it again" 200 $(P PATCH /api/admin/dispatches/$XID "{\"expireAt\":\"$(iso -5)\"}")
pub | tr '|' '\n' | grep -qx "Old one" && fail "expired one still public" || pass "hidden at once when it expires"
expect "a later expiry before the start is refused" 400 $(P PATCH /api/admin/dispatches/$LID "{\"publishAt\":\"$(iso 7200)\",\"expireAt\":\"$(iso 3600)\"}")
expect "expiry earlier than the stored start is refused (merged check)" 400 $(P PATCH /api/admin/dispatches/$DID "{\"publishAt\":\"$(iso 7200)\"}" >/dev/null; P PATCH /api/admin/dispatches/$DID "{\"expireAt\":\"$(iso 3600)\"}")
expect "unpublish" 200 $(P PATCH /api/admin/dispatches/$DID '{"published":false}')
pub | tr '|' '\n' | grep -qx "Draft one" && fail "unpublished one still public" || pass "unpublished hides at once"

echo "== order, partial updates, filter"
expect "an older pinned dispatch" 201 $(mkd '{"title":"Older pinned","date":"2020-01-01","pinned":true,"published":true}'); PID=$(jq_ "d['item']['id']")
code $B/api/dispatches >/dev/null; [ "$(jq_ "d['items'][0]['title']")" = "Older pinned" ] && pass "pinned comes first even when older" || fail "first: $(jq_ "d['items'][0]['title']")"
expect "unpin changes only that field" 200 $(P PATCH /api/admin/dispatches/$PID '{"pinned":false}')
[ "$(jq_ "d['item']['title']+'|'+str(d['item']['pinned'])+'|'+d['item']['date']")" = "Older pinned|False|2020-01-01" ] && pass "other fields untouched" || fail "partial update changed other fields"
code $B/api/dispatches >/dev/null; [ "$(jq_ "d['items'][-1]['title']")" = "Older pinned" ] && pass "oldest last once unpinned" || fail "order after unpin"
[ "$(pub '?kind=win')" = "Real one" ] && pass "filter by kind" || fail "kind filter: $(pub '?kind=win')"
expect "unknown kind in the filter" 400 $(code "$B/api/dispatches?kind=zzz")

echo "== visitors' pages and the feed"
expect "script tag in a title" 201 $(mkd '{"title":"<script>alert(1)</script>","text":"<img src=x onerror=alert(2)>","published":true}'); EID=$(jq_ "d['item']['id']")
expect "dispatches page" 200 $(code $B/dispatches); page /dispatches
has "real dispatch on the page" "Real one"; has "title escaped" "&lt;script&gt;alert(1)&lt;/script&gt;"
hasnt "no raw script tag" "<script>alert(1)</script>"; hasnt "no raw img tag" "<img src=x onerror"
hasnt "draft not on the page" "Draft one"; hasnt "scheduled not on the page" "Later one"; hasnt "expired not on the page" "Old one"
has "page advertises the feed" "application/rss+xml"
page /; has "Home shows the ticker" "vhq-ticker"; has "Home heading" "Latest from the HQ"; has "Home shows a dispatch" "Real one"; hasnt "Home: no raw script" "<script>alert(1)</script>"
expect "feed" 200 $(code $B/feed.xml); cp /tmp/body /tmp/feed-vhqdisp.xml; [ -s /tmp/feed-vhqdisp.xml ] && pass "feed saved (not empty)" || fail "feed is empty"
curl -s -D /tmp/hdr-vhqdisp -o /dev/null $B/feed.xml; grep -qi "^content-type: application/rss+xml" /tmp/hdr-vhqdisp && pass "feed content type" || fail "feed content type"
python3 - << 'PY'
import xml.dom.minidom as m, json, urllib.request
d = m.parse('/tmp/feed-vhqdisp.xml')
items = d.getElementsByTagName('item')
live = json.load(urllib.request.urlopen('http://127.0.0.1:4048/api/dispatches'))['items']
print("PASS: feed is well-formed XML" if d.documentElement.tagName == 'rss' else "FAIL: not rss")
print("PASS: feed has the same dispatches as the site" if len(items) == len(live) and len(items) > 0 else f"FAIL: feed {len(items)} vs site {len(live)}")
links = [i.getElementsByTagName('link')[0].firstChild.data for i in items]
print("PASS: feed links use the site address (APP_URL)" if all(l.startswith('http://127.0.0.1:4048/dispatches#d-') for l in links) else f"FAIL: links {links[:2]}")
titles = [i.getElementsByTagName('title')[0].firstChild.data for i in items]
print("PASS: feed keeps the script-tag title as plain text" if '<script>alert(1)</script>' in titles else f"FAIL: titles {titles}")
PY
grep -q "<script>alert(1)</script>" /tmp/feed-vhqdisp.xml && fail "raw script tag in the feed" || pass "no raw script tag in the feed"

echo "== delete needs a fresh code"
stale
expect "delete with an old code" 401 $(P DELETE /api/admin/dispatches/$EID)
fresh
expect "delete after a fresh code" 200 $(P DELETE /api/admin/dispatches/$EID)
expect "delete again" 404 $(P DELETE /api/admin/dispatches/$EID)
pub | tr '|' '\n' | grep -q "script" && fail "deleted one still public" || pass "deleted one is gone from the site"
page /dispatches; hasnt "gone from the page" "alert(1)"

echo "== safety and speed"
curl -s -D /tmp/hdr-vhqdisp -o /dev/null $B/dispatches; grep -qi "^content-security-policy:" /tmp/hdr-vhqdisp && pass "CSP on /dispatches" || fail "no CSP"
page /dispatches; hasnt "page never mentions the Office address" "$S"
python3 - << 'PY'
import re,gzip,urllib.request
html=urllib.request.urlopen("http://127.0.0.1:4048/dispatches").read().decode()
srcs=sorted(set(re.findall(r'/_next/static/[^"\']+?\.js', html)))
tot=sum(len(gzip.compress(urllib.request.urlopen("http://127.0.0.1:4048"+s).read())) for s in srcs)
print(f"  /dispatches scripts: {len(srcs)} | gzipped {tot/1024:.0f} KB | HTML {len(html)/1024:.0f} KB")
print("PASS: /dispatches first-load JS within 200 KB gzipped" if tot/1024<200 else "FAIL: /dispatches JS "+str(round(tot/1024))+" KB")
PY
grep -iE "error" /tmp/vhqdisp-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
