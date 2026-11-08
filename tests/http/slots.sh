#!/bin/bash
# P11 image slots API: login needed, only our Cloudinary pictures accepted, alt text where required, audit, library, reset.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4046; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqslots SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;const OID=m.Types.ObjectId;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 "$ROOT/tests/http/killport.py" $PORT >/dev/null
rm -rf .next && cp -a .next-pristine .next
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 160 /tmp/body)"; }
refused(){ case "$2" in 401|403) pass "$1 ($2)";; *) fail "$1 (expected 401/403 got $2) $(head -c 160 /tmp/body)";; esac; }
eqv(){ [ "$2" = "$3" ] && pass "$1" || fail "$1 (expected '$2' got '$3')"; }
jq_(){ python3 -c "import json;d=json.load(open('/tmp/body'));print($1)"; }
CB="-b /tmp/jst -c /tmp/jst"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }
fresh(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"; }
audits(){ dbq "console.log(await d.collection('auditlogs').countDocuments({event:'$1'}))"; }
LOG=/tmp/slots-app.log
(setsid nohup npx next start -p $PORT > $LOG 2>&1 &); sleep 6


C1="https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/a.jpg"; C2="https://res.cloudinary.com/demo/image/upload/v1/vhq/item/b.jpg"
echo "== not signed in"
expect "no login: list" 401 $(code $B/api/admin/slots)
expect "no login: replace" 401 $(code -X PUT $B/api/admin/slots/home.hero.bg -H "$J" -H "$O" -d "{\"url\":\"$C1\"}")
expect "no login: reset" 401 $(code -X DELETE $B/api/admin/slots/home.hero.bg -H "$O")
rm -f /tmp/jst; code -c /tmp/jst -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jst -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null
SECRET=$(jq_ "d['secret']")
code -b /tmp/jst -c /tmp/jst -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node "$ROOT/tests/http/gen-code.mjs" $SECRET 0)\"}" >/dev/null
CB="-b /tmp/jst -c /tmp/jst"
expect "no Origin (CSRF): replace" 403 $(code $CB -X PUT $B/api/admin/slots/home.hero.bg -H "$J" -d "{\"url\":\"$C1\"}")

echo "== listing"
dbq "await d.collection('museumitems').insertOne({title:'x',type:'project',status:'published',mediaUrl:'$C2',createdAt:new Date(),updatedAt:new Date()})"
expect "list" 200 $(code $CB $B/api/admin/slots)
eqv "21 slots" 21 "$(jq_ "len(d['slots'])")"
eqv "none customised yet" 0 "$(jq_ "len([s for s in d['slots'] if s['custom']])")"
eqv "pictures already on the site are offered" "True" "$(jq_ "'$C2' in d['library']")"
eqv "every slot says where it shows" 0 "$(jq_ "len([s for s in d['slots'] if len(s['where'])<4])")"

echo "== replacing"
expect "unknown slot" 404 $(P PUT /api/admin/slots/nope.nothing "{\"url\":\"$C1\"}")
expect "address outside our Cloudinary" 400 $(P PUT /api/admin/slots/home.hero.bg '{"url":"https://evil.example/a.jpg"}')
expect "http address" 400 $(P PUT /api/admin/slots/home.hero.bg '{"url":"http://res.cloudinary.com/demo/a.jpg"}')
expect "bundled path is not accepted from the Office" 400 $(P PUT /api/admin/slots/home.hero.bg '{"url":"/art/defaults/wide.svg"}')
expect "description missing where it matters" 400 $(P PUT /api/admin/slots/home.profile.photo "{\"url\":\"$C1\"}")
expect "bad focus point" 400 $(P PUT /api/admin/slots/home.hero.bg "{\"url\":\"$C1\",\"focal\":{\"x\":500,\"y\":0}}")
expect "not JSON" 400 $(P PUT /api/admin/slots/home.hero.bg 'hello')
python3 -c "print('{\"url\":\"$C1\",\"credit\":\"'+'A'*20000+'\"}')" > /tmp/slots-big.json
BC=$(code $CB -X PUT $B/api/admin/slots/home.hero.bg -H "$J" -H "$O" --data-binary @/tmp/slots-big.json); case "$BC" in 400|413|000) pass "oversized body refused ($BC)";; *) fail "oversized body ($BC)";; esac
expect "nothing was saved by the failures" 0 "$(dbq "console.log(await d.collection('imageslots').countDocuments({}))" | tr -d '\n' | sed 's/^$/0/')"
expect "replace a decorative slot" 200 $(P PUT /api/admin/slots/home.hero.bg "{\"url\":\"$C1\",\"focal\":{\"x\":30,\"y\":60},\"credit\":\"Frank\",\"license\":\"my own\"}")
expect "replace a meaningful slot with a description" 200 $(P PUT /api/admin/slots/home.profile.photo "{\"url\":\"$C2\",\"alt\":\"Frank at his desk\",\"kind\":\"library\"}")
expect "replace again (updates, no duplicate)" 200 $(P PUT /api/admin/slots/home.hero.bg "{\"url\":\"$C2\"}")
eqv "two documents, one per slot" 2 "$(dbq "console.log(await d.collection('imageslots').countDocuments({}))")"
eqv "the document holds only expected fields" "__v,_id,alt,createdAt,credit,focal,kind,license,publicId,sourceUrl,updatedAt,url,key" "$(dbq "console.log(Object.keys(await d.collection('imageslots').findOne({key:'home.hero.bg'})).sort().join(','))" | python3 -c "import sys;print(','.join(sorted(set(sys.stdin.read().strip().split(',')))).replace('key,','')+',key')" | sed 's/^,//')"
expect "list again" 200 $(code $CB $B/api/admin/slots)
eqv "two slots now yours" 2 "$(jq_ "len([s for s in d['slots'] if s['custom']])")"
eqv "focus saved" "50" "$(jq_ "[s for s in d['slots'] if s['key']=='home.hero.bg'][0]['custom']['focal']['x']")"
eqv "settings_change audited for each change" 3 "$(audits settings_change)"

echo "== resetting"
expect "reset unknown slot" 404 $(code $CB -X DELETE $B/api/admin/slots/nope.nothing -H "$O")
expect "reset" 200 $(code $CB -X DELETE $B/api/admin/slots/home.hero.bg -H "$O")
eqv "one left" 1 "$(dbq "console.log(await d.collection('imageslots').countDocuments({}))")"
expect "reset when already default is fine" 200 $(code $CB -X DELETE $B/api/admin/slots/home.hero.bg -H "$O")


echo "== importing from a link (refusals only: there is no internet or Cloudinary in the test)"
expect "no login: import" 401 $(code -X POST $B/api/admin/slots/import -H "$J" -H "$O" -d '{"link":"https://images.example/a.jpg"}')
expect "no Origin (CSRF): import" 403 $(code $CB -X POST $B/api/admin/slots/import -H "$J" -d '{"link":"https://images.example/a.jpg"}')
expect "no link" 400 $(P POST /api/admin/slots/import '{}')
expect "link is not text" 400 $(P POST /api/admin/slots/import '{"link":5}')
expect "link too short" 400 $(P POST /api/admin/slots/import '{"link":"x"}')
for L in "http://images.example/a.jpg" "ftp://images.example/a.jpg" "file:///etc/passwd" "https://user:pw@images.example/a.jpg" "https://127.0.0.1/a.jpg" "https://10.0.0.5/a.jpg" "https://169.254.169.254/latest/meta-data" "https://[::1]/a.jpg" "https://localhost/a.jpg"; do
  expect "refused: $L" 400 $(P POST /api/admin/slots/import "{\"link\":\"$L\"}")
done
eqv "the refusal explains itself" "True" "$(P POST /api/admin/slots/import '{"link":"https://127.0.0.1/a.jpg"}' >/dev/null; jq_ "'private' in d['error']")"
expect "save a slot as an import with its source" 200 $(P PUT /api/admin/slots/home.hero.bg "{\"url\":\"$C1\",\"kind\":\"import\",\"sourceUrl\":\"https://images.example/a.jpg\",\"publicId\":\"vhq/slot/a\",\"credit\":\"Source: images.example\"}")
eqv "source kept" "https://images.example/a.jpg" "$(dbq "console.log((await d.collection('imageslots').findOne({key:'home.hero.bg'})).sourceUrl)")"
expect "a bad source link is refused" 400 $(P PUT /api/admin/slots/home.hero.bg "{\"url\":\"$C1\",\"kind\":\"import\",\"sourceUrl\":\"javascript:alert(1)\"}")
expect "reset clears the import too" 200 $(code $CB -X DELETE $B/api/admin/slots/home.hero.bg -H "$O")

echo "== server log"
grep -q "Traceback\|TypeError\|Unhandled" $LOG && fail "errors in the server log" || pass "no errors in the server log"
python3 "$ROOT/tests/http/killport.py" $PORT >/dev/null
