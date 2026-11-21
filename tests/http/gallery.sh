#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4049; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqgal SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B CLOUDINARY_CLOUD_NAME=democloud CLOUDINARY_API_KEY=123456789012345 CLOUDINARY_API_SECRET=fake-secret-value-123
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
rm -rf .next && cp -a .next-pristine .next
(setsid nohup npx next start -p $PORT > /tmp/vhqgal-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 160 /tmp/body)"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
rm -f /tmp/jm-vhqgal; code -c /tmp/jm-vhqgal -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jm-vhqgal -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
code -b /tmp/jm-vhqgal -c /tmp/jm-vhqgal -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)\"}" >/dev/null
CB="-b /tmp/jm-vhqgal -c /tmp/jm-vhqgal"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }
fresh(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"; }
iso(){ node -e "console.log(new Date(Date.now()+($1)*1000).toISOString())"; }
page(){ curl -s -m 20 "$B$1" -o /tmp/page-vhqgal.html; }
has(){ grep -qF -- "$2" /tmp/page-vhqgal.html && pass "$1" || fail "$1 (missing: $2)"; }
hasnt(){ grep -qF -- "$2" /tmp/page-vhqgal.html && fail "$1 (found: $2)" || pass "$1"; }
RAW=https://res.cloudinary.com/democloud/image/upload/v1/vhq/gallery
batch(){ python3 -c "
import json,sys
a=int(sys.argv[1]);b=int(sys.argv[2]);alb=sys.argv[3] or None;pub=sys.argv[4]=='1'
print(json.dumps({'images':[{'imageUrl':f'https://res.cloudinary.com/democloud/image/upload/v1/vhq/gallery/a{k}.jpg','alt':f'Alt {k}','album':alb,'published':pub} for k in range(a,b+1)]}))" "$@"; }
ids(){ jq_ "' '.join(i['id'] for i in d['images'])"; }
pos(){ python3 -c "
h=open('/tmp/page-vhqgal.html').read()
print(h.find('alt=\"'+'$1'+'\"'))"; }

echo "== login needed"
expect "no login: list" 401 $(code $B/api/admin/gallery)
expect "no login: add pictures" 401 $(code -X POST $B/api/admin/gallery -H "$J" -H "$O" -d "$(batch 1 1 '' 0)")
expect "no login: change a picture" 401 $(code -X PATCH $B/api/admin/gallery/aaaaaaaaaaaaaaaaaaaaaaaa -H "$J" -H "$O" -d '{"published":true}')
expect "no login: delete a picture" 401 $(code -X DELETE $B/api/admin/gallery/aaaaaaaaaaaaaaaaaaaaaaaa -H "$O")
expect "no login: reorder" 401 $(code -X PUT $B/api/admin/gallery/order -H "$J" -H "$O" -d '{"ids":["aaaaaaaaaaaaaaaaaaaaaaaa"]}')
expect "no login: create album" 401 $(code -X POST $B/api/admin/albums -H "$J" -H "$O" -d '{"title":"x"}')
expect "no login: delete album" 401 $(code -X DELETE $B/api/admin/albums/aaaaaaaaaaaaaaaaaaaaaaaa -H "$O")
expect "no login: upload signature" 401 $(code -X POST $B/api/admin/upload-sign -H "$J" -H "$O" -d '{"folder":"gallery"}')

echo "== the gallery signature only allows formats whose location data we remove"
expect "sign for gallery" 200 $(P POST /api/admin/upload-sign '{"folder":"gallery"}')
[ "$(jq_ "d['folder']")" = "vhq/gallery" ] && pass "gallery folder" || fail "folder: $(jq_ "d['folder']")"
[ "$(jq_ "d['allowedFormats']")" = "jpg,jpeg,png,webp" ] && pass "no gif, no avif in the gallery" || fail "formats: $(jq_ "d['allowedFormats']")"
SIG=$(jq_ "d['signature']"); TS=$(jq_ "d['timestamp']")
EXPECTED=$(node -e "const {v2:c}=require('cloudinary');console.log(c.utils.api_sign_request({timestamp:$TS,folder:'vhq/gallery',allowed_formats:'jpg,jpeg,png,webp'},'fake-secret-value-123'))")
[ "$SIG" = "$EXPECTED" ] && pass "signature matches an independent Cloudinary calculation" || fail "signature mismatch"
expect "sign for a normal folder" 200 $(P POST /api/admin/upload-sign '{"folder":"project"}')
[ "$(jq_ "d['allowedFormats']")" = "jpg,jpeg,png,webp,gif,avif" ] && pass "other folders keep their formats" || fail "project formats: $(jq_ "d['allowedFormats']")"
expect "unknown folder" 400 $(P POST /api/admin/upload-sign '{"folder":"../x"}')

echo "== an empty gallery"
expect "gallery page" 200 $(code $B/gallery); page /gallery; has "friendly empty message" "being prepared"
page /; hasnt "Home has no gallery strip yet" "Open the gallery"
expect "Office list" 200 $(code $CB $B/api/admin/gallery); [ "$(jq_ "len(d['images'])+len(d['albums'])")" = "0" ] && pass "nothing yet" || fail "not empty"

echo "== validation"
expect "no alt text" 400 $(P POST /api/admin/gallery "{\"images\":[{\"imageUrl\":\"$RAW/a1.jpg\"}]}")
expect "empty alt text" 400 $(P POST /api/admin/gallery "{\"images\":[{\"imageUrl\":\"$RAW/a1.jpg\",\"alt\":\"\"}]}")
expect "alt text of only spaces" 400 $(P POST /api/admin/gallery "{\"images\":[{\"imageUrl\":\"$RAW/a1.jpg\",\"alt\":\"   \"}]}")
expect "one picture without alt among good ones" 400 $(P POST /api/admin/gallery "{\"images\":[{\"imageUrl\":\"$RAW/a1.jpg\",\"alt\":\"ok\"},{\"imageUrl\":\"$RAW/a2.jpg\"}]}")
expect "picture from another site" 400 $(P POST /api/admin/gallery '{"images":[{"imageUrl":"https://evil.example/x.jpg","alt":"x"}]}')
expect "bundled sample file" 400 $(P POST /api/admin/gallery '{"images":[{"imageUrl":"/samples/story.svg","alt":"x"}]}')
expect "no pictures at all" 400 $(P POST /api/admin/gallery '{"images":[]}')
expect "21 pictures" 400 $(P POST /api/admin/gallery "$(batch 1 21 '' 0)")
expect "album that does not exist" 400 $(P POST /api/admin/gallery "$(batch 1 1 aaaaaaaaaaaaaaaaaaaaaaaa 0)")
expect "album id that is not an id" 400 $(P POST /api/admin/gallery "$(batch 1 1 nope 0)")
expect "bad date taken" 400 $(P POST /api/admin/gallery "{\"images\":[{\"imageUrl\":\"$RAW/a1.jpg\",\"alt\":\"x\",\"takenDate\":\"yesterday\"}]}")
expect "alt text over 200" 400 $(P POST /api/admin/gallery "{\"images\":[{\"imageUrl\":\"$RAW/a1.jpg\",\"alt\":\"$(python3 -c "print('x'*201)")\"}]}")
expect "not json" 400 $(code $CB -X POST $B/api/admin/gallery -H "$J" -H "$O" -d 'nope')
code $CB $B/api/admin/gallery >/dev/null; [ "$(jq_ "len(d['images'])")" = "0" ] && pass "nothing was saved by the refused requests" || fail "refused requests saved something"

echo "== adding pictures"
expect "add 3 pictures at once" 201 $(P POST /api/admin/gallery "$(batch 1 3 '' 0)"); read -r I1 I2 I3 <<< "$(ids)"
[ "$(jq_ "[i['order'] for i in d['images']]")" = "[0, 1, 2]" ] && pass "they keep the order sent" || fail "orders: $(jq_ "[i['order'] for i in d['images']]")"
[ "$(jq_ "all(not i['published'] for i in d['images'])")" = "True" ] && pass "they start as drafts" || fail "not drafts"
expect "add 2 more" 201 $(P POST /api/admin/gallery "$(batch 4 5 '' 0)"); read -r I4 I5 <<< "$(ids)"
[ "$(jq_ "[i['order'] for i in d['images']]")" = "[3, 4]" ] && pass "new ones go to the end" || fail "orders: $(jq_ "[i['order'] for i in d['images']]")"
page /gallery; has "drafts are not public" "being prepared"

echo "== publishing and what visitors get"
expect "publish picture 1" 200 $(P PATCH /api/admin/gallery/$I1 '{"published":true}')
expect "publish picture 2" 200 $(P PATCH /api/admin/gallery/$I2 '{"published":true}')
page /gallery; has "picture 1 shown" 'alt="Alt 1"'; has "picture 2 shown" 'alt="Alt 2"'; hasnt "draft 3 not shown" 'alt="Alt 3"'
has "wall uses resized links" "f_auto,q_auto,w_640"; has "blurred placeholder" "e_blur"
hasnt "the stored original link is never sent (1)" "upload/v1/vhq/gallery/a1.jpg"; hasnt "the stored original link is never sent (2)" "upload/v1/vhq/gallery/a2.jpg"
has "lazy loading" 'loading="lazy"'
page /; has "Home shows the gallery strip" "Open the gallery"
curl -s -D /tmp/hdr-vhqgal -o /dev/null $B/gallery; grep -qi "^content-security-policy:" /tmp/hdr-vhqgal && pass "CSP on /gallery" || fail "no CSP"

echo "== alt text can never be emptied"
expect "empty alt on edit" 400 $(P PATCH /api/admin/gallery/$I1 '{"alt":""}')
expect "spaces as alt on edit" 400 $(P PATCH /api/admin/gallery/$I1 '{"alt":"   "}')
expect "change alt text" 200 $(P PATCH /api/admin/gallery/$I1 '{"alt":"Sunrise over the hills","caption":"Early start"}')
page /gallery; has "new alt text shown" 'alt="Sunrise over the hills"'; has "caption shown" "Early start"; hasnt "old alt gone" 'alt="Alt 1"'
[ "$(jq_ "d['image']['alt']")" = "Sunrise over the hills" ] && pass "answer carries the new alt" || fail "patch answer"
expect "partial update keeps the rest" 200 $(P PATCH /api/admin/gallery/$I1 '{"takenDate":"2026-05-01"}')
[ "$(jq_ "d['image']['alt']+'|'+d['image']['caption']+'|'+str(d['image']['published'])")" = "Sunrise over the hills|Early start|True" ] && pass "alt, caption and publish state untouched" || fail "partial update wiped fields"
expect "clear the date again" 200 $(P PATCH /api/admin/gallery/$I1 '{"takenDate":""}')
expect "nothing to change" 400 $(P PATCH /api/admin/gallery/$I1 '{}')
expect "unknown picture" 404 $(P PATCH /api/admin/gallery/aaaaaaaaaaaaaaaaaaaaaaaa '{"published":true}')
expect "bad id" 404 $(P PATCH /api/admin/gallery/zzz '{"published":true}')

echo "== reordering"
expect "put picture 2 before 1" 200 $(P PUT /api/admin/gallery/order "{\"ids\":[\"$I2\",\"$I1\"]}")
page /gallery; A=$(pos "Alt 2"); B2=$(pos "Sunrise over the hills"); [ "$A" -gt 0 ] && [ "$B2" -gt "$A" ] && pass "visitors see the new order" || fail "order on the page: $A then $B2"
code $CB $B/api/admin/gallery >/dev/null; [ "$(jq_ "[i['id'] for i in d['images']][:2]==['$I2','$I1']")" = "True" ] && pass "Office list agrees" || fail "Office order"
expect "the same id twice" 400 $(P PUT /api/admin/gallery/order "{\"ids\":[\"$I1\",\"$I1\"]}")
expect "an id that does not exist" 400 $(P PUT /api/admin/gallery/order "{\"ids\":[\"$I1\",\"aaaaaaaaaaaaaaaaaaaaaaaa\"]}")
expect "no ids" 400 $(P PUT /api/admin/gallery/order '{"ids":[]}')
expect "ids that are not ids" 400 $(P PUT /api/admin/gallery/order '{"ids":["x"]}')
expect "order back" 200 $(P PUT /api/admin/gallery/order "{\"ids\":[\"$I1\",\"$I2\"]}")

echo "== albums"
expect "create album" 201 $(P POST /api/admin/albums '{"title":"Kigali","description":"Home town"}'); AID=$(jq_ "d['album']['id']")
expect "album needs a title" 400 $(P POST /api/admin/albums '{"title":""}')
expect "album title over 80" 400 $(P POST /api/admin/albums "{\"title\":\"$(python3 -c "print('x'*81)")\"}")
expect "put pictures 1 and 2 in it" 200 $(P PATCH /api/admin/gallery/$I1 "{\"album\":\"$AID\"}"); P PATCH /api/admin/gallery/$I2 "{\"album\":\"$AID\"}" >/dev/null
expect "album that does not exist" 400 $(P PATCH /api/admin/gallery/$I1 '{"album":"aaaaaaaaaaaaaaaaaaaaaaaa"}')
expect "publish picture 3 (no album)" 200 $(P PATCH /api/admin/gallery/$I3 '{"published":true}')
page /gallery; has "album heading" ">Kigali<"; has "album text" "Home town"; has "More pictures chapter" "More pictures"; has "jump links" "#album-$AID"
A=$(pos "Alt 3"); B2=$(pos "Alt 2"); [ "$A" -gt "$B2" ] && [ "$B2" -gt 0 ] && pass "album pictures come before the ones with no album" || fail "chapter order: $B2 then $A"
expect "rename the album" 200 $(P PATCH /api/admin/albums/$AID '{"title":"Kigali 2026"}'); page /gallery; has "new album title" "Kigali 2026"
expect "album with only a draft" 201 $(P POST /api/admin/albums '{"title":"Hidden one"}'); HID=$(jq_ "d['album']['id']")
expect "draft 4 goes in it" 200 $(P PATCH /api/admin/gallery/$I4 "{\"album\":\"$HID\"}")
page /gallery; hasnt "an album with nothing published is not shown" "Hidden one"
expect "delete that album" 200 $(P DELETE /api/admin/albums/$HID)
code $CB $B/api/admin/gallery >/dev/null; [ "$(jq_ "[i['album'] for i in d['images'] if i['id']=='$I4'][0]=='' ")" = "True" ] && pass "deleting an album keeps its pictures (moved out of it)" || fail "picture lost or still in the album"
expect "delete it again" 404 $(P DELETE /api/admin/albums/$HID)
expect "delete album with a bad id" 404 $(P DELETE /api/admin/albums/zzz)

echo "== escaping"
expect "script tags in alt and caption" 201 $(P POST /api/admin/gallery '{"images":[{"imageUrl":"https://res.cloudinary.com/democloud/image/upload/v1/vhq/gallery/x.jpg","alt":"<script>alert(1)</script>","caption":"<img src=x onerror=alert(2)>","published":true}]}'); XID=$(jq_ "d['images'][0]['id']")
page /gallery; has "alt escaped" "&lt;script&gt;alert(1)&lt;/script&gt;"; hasnt "no raw script tag" "<script>alert(1)</script>"; hasnt "no raw img tag" "<img src=x onerror"

echo "== delete a picture needs a fresh code"
stale
expect "delete with an old code" 401 $(P DELETE /api/admin/gallery/$XID)
fresh
expect "delete after a fresh code" 200 $(P DELETE /api/admin/gallery/$XID)
expect "delete again" 404 $(P DELETE /api/admin/gallery/$XID)
expect "delete with a bad id" 404 $(P DELETE /api/admin/gallery/zzz)
page /gallery; hasnt "gone from the page" "alert(1)"

echo "== unpublish everything"
for i in $I1 $I2 $I3; do P PATCH /api/admin/gallery/$i '{"published":false}' >/dev/null; done
page /gallery; has "back to the friendly message" "being prepared"; page /; hasnt "Home strip hides again" "Open the gallery"

echo "== safety and speed"
page /gallery; hasnt "page never mentions the Office address" "$S"
python3 - << 'PY'
import re,gzip,urllib.request
html=urllib.request.urlopen("http://127.0.0.1:4049/gallery").read().decode()
srcs=sorted(set(re.findall(r'/_next/static/[^"\']+?\.js', html)))
tot=sum(len(gzip.compress(urllib.request.urlopen("http://127.0.0.1:4049"+s).read())) for s in srcs)
print(f"  /gallery scripts: {len(srcs)} | gzipped {tot/1024:.0f} KB | HTML {len(html)/1024:.0f} KB")
print("PASS: /gallery first-load JS within 200 KB gzipped" if tot/1024<200 else "FAIL: /gallery JS "+str(round(tot/1024))+" KB")
PY
grep -iE "error" /tmp/vhqgal-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
