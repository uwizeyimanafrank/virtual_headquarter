#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4033; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqp3 SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B CLOUDINARY_CLOUD_NAME=democloud CLOUDINARY_API_KEY=123456789012345 CLOUDINARY_API_SECRET=fake-secret-value-123
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
(setsid nohup npx next start -p $PORT > /tmp/p3-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 200 /tmp/body)"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
rm -f /tmp/jc; code -c /tmp/jc -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jc -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
code -b /tmp/jc -c /tmp/jc -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)\"}" >/dev/null
for i in 0 1 2 3 4 5; do eval "REC$i=$(jq_ "d['recoveryCodes'][$i]")"; done
CB="-b /tmp/jc -c /tmp/jc"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }

echo "== auth on every new endpoint"
for ep in items "items/aaaaaaaaaaaaaaaaaaaaaaaa" messages settings; do expect "no login: GET /api/admin/$ep" 401 $(code $B/api/admin/$ep); done
expect "no login: upload-sign" 401 $(code -X POST $B/api/admin/upload-sign -H "$J" -H "$O" -d '{"folder":"project"}')
expect "no Origin on create (CSRF)" 403 $(code $CB -X POST $B/api/admin/items -H "$J" -d '{"type":"project","title":"x","date":"2026-01"}')

echo "== create + validation"
expect "missing title" 400 $(P POST /api/admin/items '{"type":"project","date":"2026-01"}')
expect "bad date" 400 $(P POST /api/admin/items '{"type":"project","title":"x","date":"2026-13"}')
expect "bad type" 400 $(P POST /api/admin/items '{"type":"hack","title":"x","date":"2026-01"}')
expect "external image host refused" 400 $(P POST /api/admin/items '{"type":"project","title":"x","date":"2026-01","mediaUrl":"https://evil.example/a.png"}'); echo "  $(jq_ "[i['message'][:50] for i in d['issues']]")"
expect "javascript link refused" 400 $(P POST /api/admin/items '{"type":"project","title":"x","date":"2026-01","metadata":{"gradeOrLink":"javascript:alert(1)"}}')
expect "too many skills refused" 400 $(P POST /api/admin/items "{\"type\":\"project\",\"title\":\"x\",\"date\":\"2026-01\",\"metadata\":{\"skills\":$(python3 -c "import json;print(json.dumps(['s%d'%i for i in range(25)]))")}}")
expect "create project A (cloudinary image)" 201 $(P POST /api/admin/items '{"type":"project","title":"Project A","description":"Alpha text","date":"2026-03","mediaUrl":"https://res.cloudinary.com/democloud/image/upload/v1/a.jpg","metadata":{"skills":["Next.js","MongoDB"],"gradeOrLink":"https://example.org/a"}}')
A=$(jq_ "d['item']['id']"); echo "  status default: $(jq_ "d['item']['status']") | sample: $(jq_ "d['item']['isSample']")"
for n in B C; do P POST /api/admin/items "{\"type\":\"project\",\"title\":\"Project $n\",\"date\":\"2026-0$([ $n = B ] && echo 4 || echo 5)\",\"status\":\"published\"}" >/dev/null; eval "ID$n=$(jq_ "d['item']['id']")"; done
expect "script tag text is stored as text" 201 $(P POST /api/admin/items '{"type":"story","title":"<script>alert(1)</script>","date":"2026-01"}'); XSS=$(jq_ "d['item']['id']")
echo "== list + filters"
expect "list" 200 $(code $CB $B/api/admin/items); echo "  count: $(jq_ "len(d['items'])")"
expect "filter type=project" 200 $(code $CB "$B/api/admin/items?type=project"); [ "$(jq_ "len(d['items'])")" = "3" ] && pass "3 projects" || fail "type filter"
expect "filter status=published" 200 $(code $CB "$B/api/admin/items?status=published"); [ "$(jq_ "len(d['items'])")" = "2" ] && pass "2 published" || fail "status filter: $(jq_ "len(d['items'])")"
expect "search q=project b" 200 $(code $CB "$B/api/admin/items?q=project%20b"); [ "$(jq_ "len(d['items'])")" = "1" ] && pass "search finds 1" || fail "search"
expect "get one" 200 $(code $CB $B/api/admin/items/$A); [ "$(jq_ "d['item']['title']")" = "Project A" ] && pass "get one returns it" || fail "get one"
expect "get bad id" 404 $(code $CB $B/api/admin/items/zzz)
echo "== draft hidden, publish shows, partial update safe"
code $B/api/museum >/dev/null; python3 -c "
import json;t=[i['title'] for i in json.load(open('/tmp/body'))['items']];print('  public now:',t)
print('PASS: draft Project A hidden from public' if 'Project A' not in t else 'FAIL: draft leaked')"
expect "PATCH status only" 200 $(P PATCH /api/admin/items/$A '{"status":"published"}')
[ "$(jq_ "d['item']['description']")" = "Alpha text" ] && [ "$(jq_ "d['item']['metadata']['skills']")" = "['Next.js', 'MongoDB']" ] && pass "partial update did NOT wipe description or skills" || fail "partial update wiped fields: $(cat /tmp/body | head -c 300)"
code $B/api/museum >/dev/null; python3 -c "
import json;t=[i['title'] for i in json.load(open('/tmp/body'))['items']]
print('PASS: published Project A is public' if 'Project A' in t else 'FAIL: not public')"
expect "PATCH invalid" 400 $(P PATCH /api/admin/items/$A '{"date":"nope"}')
expect "PATCH empty" 400 $(P PATCH /api/admin/items/$A '{}')
expect "PATCH unknown id" 404 $(P PATCH /api/admin/items/aaaaaaaaaaaaaaaaaaaaaaaa '{"title":"x"}')
expect "PATCH metadata only keeps rest" 200 $(P PATCH /api/admin/items/$A '{"metadata":{"howIEarnedIt":"built it"}}'); [ "$(jq_ "d['item']['metadata']['skills']")" = "['Next.js', 'MongoDB']" ] && [ "$(jq_ "d['item']['metadata']['howIEarnedIt']")" = "built it" ] && pass "metadata merge keeps skills" || fail "metadata merge"
echo "== sample becomes real when content is edited"
dbq "await d.collection('museumitems').insertOne({type:'book',title:'Sample book X',description:'',mediaUrl:'/samples/book.svg',parallaxSpeed:0.5,date:'2026-01',status:'published',order:0,isSample:true,metadata:{skills:[]}})"
SB=$(dbq "const x=await d.collection('museumitems').findOne({title:'Sample book X'});console.log(String(x._id))")
expect "toggle status of a sample keeps it a sample" 200 $(P PATCH /api/admin/items/$SB '{"status":"draft"}'); [ "$(jq_ "d['item']['isSample']")" = "True" ] && pass "still sample after status toggle" || fail "sample flag lost on toggle"
expect "edit title of a sample" 200 $(P PATCH /api/admin/items/$SB '{"title":"My real book"}'); [ "$(jq_ "d['item']['isSample']")" = "False" ] && pass "sample became real after content edit" || fail "still sample"
echo "== reorder"
expect "reorder C,B,A" 200 $(P POST /api/admin/items/reorder "{\"ids\":[\"$IDC\",\"$IDB\",\"$A\"]}")
code $B/api/museum?type=project >/dev/null; [ "$(jq_ "[i['title'] for i in d['items']]")" = "['Project C', 'Project B', 'Project A']" ] && pass "public order follows reorder" || fail "order: $(jq_ "[i['title'] for i in d['items']]")"
expect "reorder with duplicates refused" 400 $(P POST /api/admin/items/reorder "{\"ids\":[\"$A\",\"$A\"]}")
expect "reorder with bad id refused" 400 $(P POST /api/admin/items/reorder '{"ids":["zzz"]}')
echo "== delete needs fresh 2FA"
stale
expect "delete with stale 2FA" 401 $(P DELETE /api/admin/items/$XSS); [ "$(jq_ "d.get('code')")" = "STEP_UP_REQUIRED" ] && pass "asks for step-up" || fail "no step-up code"
expect "step-up (recovery code)" 200 $(P POST /api/admin/stepup "{\"code\":\"$REC0\"}")
expect "delete item" 200 $(P DELETE /api/admin/items/$XSS)
expect "deleted item is gone" 404 $(code $CB $B/api/admin/items/$XSS)
expect "delete missing" 404 $(P DELETE /api/admin/items/$XSS)
echo "== upload signature"
expect "sign for project" 200 $(P POST /api/admin/upload-sign '{"folder":"project"}'); echo "  folder: $(jq_ "d['folder']") formats: $(jq_ "d['allowedFormats']")"
SIG=$(jq_ "d['signature']"); TS=$(jq_ "d['timestamp']")
EXPECTED=$(node -e "const {v2:c}=require('cloudinary');console.log(c.utils.api_sign_request({timestamp:$TS,folder:'vhq/project',allowed_formats:'jpg,jpeg,png,webp,gif,avif'},'fake-secret-value-123'))")
[ "$SIG" = "$EXPECTED" ] && pass "signature matches an independent Cloudinary calculation" || fail "signature mismatch"
grep -q "fake-secret-value-123" /tmp/body && fail "API SECRET LEAKED in sign response" || pass "secret not in sign response"
expect "sign for profile" 200 $(P POST /api/admin/upload-sign '{"folder":"profile"}')
expect "sign bad folder" 400 $(P POST /api/admin/upload-sign '{"folder":"../../etc"}')
echo "== messages"
for i in 1 2 3; do code -X POST $B/api/connect -H "$J" -H "$O" -d "{\"name\":\"Visitor $i\",\"email\":\"v$i@mail.com\",\"message\":\"Hello <b>$i</b>\"}" >/dev/null; done
expect "messages list" 200 $(code $CB $B/api/admin/messages); echo "  count $(jq_ "len(d['messages'])") unread $(jq_ "d['unread']") | body[0]: $(jq_ "d['messages'][0]['body']")"
M1=$(jq_ "d['messages'][0]['id']"); M2=$(jq_ "d['messages'][1]['id']")
expect "mark read" 200 $(P PATCH /api/admin/messages/$M1 '{"read":true}'); code $CB $B/api/admin/messages >/dev/null; [ "$(jq_ "d['unread']")" = "2" ] && pass "unread count drops to 2" || fail "unread count"
expect "archive" 200 $(P PATCH /api/admin/messages/$M2 '{"archived":true}'); code $CB $B/api/admin/messages >/dev/null; [ "$(jq_ "len(d['messages'])")" = "2" ] && pass "inbox shrinks to 2" || fail "archive"
code $CB "$B/api/admin/messages?archived=1" >/dev/null; [ "$(jq_ "len(d['messages'])")" = "1" ] && pass "archive has 1" || fail "archive list"
expect "message patch invalid" 400 $(P PATCH /api/admin/messages/$M1 '{}')
expect "message patch bad id" 400 $(P PATCH /api/admin/messages/zzz '{"read":true}')
stale
expect "delete message with stale 2FA" 401 $(P DELETE /api/admin/messages/$M1)
P POST /api/admin/stepup "{\"code\":\"$REC1\"}" >/dev/null
expect "delete message" 200 $(P DELETE /api/admin/messages/$M1)
expect "delete message again" 404 $(P DELETE /api/admin/messages/$M1)
echo "== settings"
expect "settings get" 200 $(code $CB $B/api/admin/settings); echo "  heroTitle: $(jq_ "d['heroTitle']")"
expect "settings patch hero" 200 $(P PATCH /api/admin/settings '{"heroTitle":"New headline","chapterTitles":{"projects":"My Work"}}'); [ "$(jq_ "d['heroTitle']")" = "New headline" ] && [ "$(jq_ "d['chapterTitles']['projects']")" = "My Work" ] && [ "$(jq_ "d['chapterTitles']['about'] != ''")" = "True" ] && pass "hero + one chapter title updated, others kept" || fail "settings patch"
expect "photo from external host refused" 400 $(P PATCH /api/admin/settings '{"profile":{"photoUrl":"https://evil.example/me.png"}}')
expect "bio too long refused" 400 $(P PATCH /api/admin/settings "{\"profile\":{\"bio\":\"$(python3 -c "print('x'*2001)")\"}}")
expect "settings patch empty" 400 $(P PATCH /api/admin/settings '{}')
code $CB $B/api/admin/samples >/dev/null  # status call may seed samples; real items exist so it must not
dbq "await d.collection('settings').updateOne({key:'main'},{\$set:{'profile.name':'Your Name','profile.tagline':'Developer in progress','profile.bio':'sample','profile.photoUrl':'/samples/profile.svg','onboarding.profileIsSample':true}})"
expect "save real name/bio/tagline, photo still sample" 200 $(P PATCH /api/admin/settings '{"profile":{"name":"Frank","tagline":"Builder","bio":"My real bio"}}'); [ "$(jq_ "d['profileIsSample']")" = "True" ] && pass "profile still flagged sample while photo is sample" || fail "flag cleared too early"
expect "set real photo" 200 $(P PATCH /api/admin/settings '{"profile":{"photoUrl":"https://res.cloudinary.com/democloud/image/upload/me.jpg"}}'); [ "$(jq_ "d['profileIsSample']")" = "False" ] && pass "profile no longer sample once all fields are real" || fail "flag not cleared"
echo "== pages"
for pg in content content/new content/$A messages settings; do expect "page /$pg" 200 $(code $CB $B/$S/$pg); done
for pg in content content/new content/$A messages settings; do code -b "vhq_session=bogus" $B/$S/$pg >/dev/null; grep -qE "Add item|Project A|Everything visitors see|Messages visitors send|Home page wording|Your profile and the wording" /tmp/body && fail "page /$pg leaks to bogus cookie" || pass "page /$pg leaks nothing to bogus cookie"; done
for bad in aaaaaaaaaaaaaaaaaaaaaaaa zzz; do code $CB $B/$S/content/$bad >/dev/null; if grep -q "NEXT_HTTP_ERROR_FALLBACK;404" /tmp/body && ! grep -q "Edit item" /tmp/body; then pass "edit page for unknown id ($bad) shows the not-found screen, no form"; else fail "edit page for unknown id ($bad) did not show not-found"; fi; done
code $CB $B/$S/content/$A >/dev/null; grep -q "Alpha text" /tmp/body && pass "edit page is pre-filled from the database" || fail "edit page not pre-filled"
echo "== audit"
code $CB $B/api/admin/audit >/dev/null; python3 -c "
import json;e=[x['event'] for x in json.load(open('/tmp/body'))['events']];print('  events:',e)
print('PASS: deletes and settings changes are audited' if e.count('delete')>=2 and 'settings_change' in e else 'FAIL: audit missing')"
grep -iE "error" /tmp/p3-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
