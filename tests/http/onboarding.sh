#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4032; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqp2b SESSION_SECRET=test-secret-not-real
export SERVICE_CRED_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
export ADMIN_ROUTE_SLUG=$S APP_URL=$B
export ADMIN_BOOTSTRAP_HASH="b64:$(node -e "require('@node-rs/argon2').hash('$PASS',{memoryCost:19456,timeCost:2,parallelism:1}).then(h=>process.stdout.write(Buffer.from(h).toString('base64')))")"
ensure_db(){ if ! python3 -c "import socket;socket.create_connection(('127.0.0.1',27017),1)" 2>/dev/null; then (setsid nohup "${FERRET_BIN:-ferretdb}" --handler=sqlite --sqlite-url=file:${FERRET_DATA:-/tmp/fdb}/ --listen-addr=127.0.0.1:27017 --telemetry=disable --debug-addr=- > /tmp/ferret.log 2>&1 & echo $! > /tmp/ferret.pid); sleep 3; fi; }
ensure_db
dbq(){ node -e "const m=require('mongoose');m.connect(process.env.MONGODB_URI).then(async()=>{const d=m.connection.db;$1;process.exit(0)})"; }
dbq "await d.dropDatabase()"
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
(setsid nohup npx next start -p $PORT > /tmp/p2b-app.log 2>&1 &) ; sleep 6
pass(){ echo "PASS: $1"; }; fail(){ echo "FAIL: $1"; }
code(){ curl -s -o /tmp/body -w "%{http_code}" "$@"; }
expect(){ [ "$2" = "$3" ] && pass "$1 ($3)" || fail "$1 (expected $2 got $3) $(head -c 160 /tmp/body)"; }
jq_(){ python3 -c "import json,sys;d=json.load(open('/tmp/body'));print($1)"; }
# --- login + 2FA enrol
rm -f /tmp/jb; code -c /tmp/jb -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jb -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null; SECRET=$(jq_ "d['secret']")
CODE0=$(node $ROOT/tests/http/gen-code.mjs $SECRET 0)
code -b /tmp/jb -c /tmp/jb -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$CODE0\"}" >/dev/null
REC1=$(jq_ "d['recoveryCodes'][0]"); REC2=$(jq_ "d['recoveryCodes'][1]"); REC3=$(jq_ "d['recoveryCodes'][2]")
CB="-b /tmp/jb -c /tmp/jb"
echo "== pages"
for pg in setup setup/doctor settings; do expect "page /$pg" 200 $(code $CB $B/$S/$pg); done
for pg in setup setup/doctor settings; do code -b "vhq_session=bogus" $B/$S/$pg >/dev/null; grep -qE "Config Doctor|Getting started|Test without saving|Health checks|Your name, photo" /tmp/body && fail "page /$pg leaks to bogus cookie" || pass "page /$pg leaks nothing to bogus cookie"; done
echo "== samples seeding"
expect "museum empty before first dashboard visit" 200 $(code $B/api/museum); echo "  items: $(jq_ "len(d['items'])")"
expect "first samples status call seeds" 200 $(code $CB $B/api/admin/samples)
expect "museum after dashboard" 200 $(code $B/api/museum); python3 -c "
import json;d=json.load(open('/tmp/body'))['items'];import collections
print('  items:',len(d),dict(collections.Counter(i['type'] for i in d)),'| first types order:',[i['type'] for i in d][:3])"
expect "samples status again (idempotent)" 200 $(code $CB $B/api/admin/samples); expect "museum count unchanged" 200 $(code $B/api/museum); [ "$(jq_ "len(d['items'])")" = "6" ] && pass "still exactly 6 samples" || fail "sample count changed: $(jq_ "len(d['items'])")"
dbq "const s=await d.collection('settings').find().toArray();console.log('  settings docs:',s.length,'| profile:',s[0].profile.name,'|',s[0].profile.photoUrl,'| profileIsSample:',s[0].onboarding.profileIsSample,'| seeded:',s[0].onboarding.samplesSeeded)"
echo "== onboarding"
expect "checklist" 200 $(code $CB $B/api/admin/onboarding); python3 -c "
import json;d=json.load(open('/tmp/body'));print('  ',[(i['key'],'done' if i['done'] else 'skipped' if i['skipped'] else 'todo') for i in d['items']]);print('   done',d['doneCount'],'/',d['total'],'tourSeen',d['tourSeen'])"
expect "skip documents" 200 $(code $CB -X POST $B/api/admin/onboarding -H "$J" -H "$O" -d '{"action":"step","step":"documents","state":"skipped"}'); [ "$(jq_ "[i['skipped'] for i in d['items'] if i['key']=='documents'][0]")" = "True" ] && pass "documents skipped" || fail "skip not stored"
expect "undo skip" 200 $(code $CB -X POST $B/api/admin/onboarding -H "$J" -H "$O" -d '{"action":"step","step":"documents","state":"clear"}'); [ "$(jq_ "[i['skipped'] for i in d['items'] if i['key']=='documents'][0]")" = "False" ] && pass "skip cleared" || fail "clear failed"
expect "mark vault step done" 200 $(code $CB -X POST $B/api/admin/onboarding -H "$J" -H "$O" -d '{"action":"step","step":"firstVaultEntry","state":"done"}')
expect "tour seen" 200 $(code $CB -X POST $B/api/admin/onboarding -H "$J" -H "$O" -d '{"action":"tour","seen":true}'); [ "$(jq_ "d['tourSeen']")" = "True" ] && pass "tourSeen stored" || fail "tour flag"
expect "invalid step rejected" 400 $(code $CB -X POST $B/api/admin/onboarding -H "$J" -H "$O" -d '{"action":"step","step":"hack","state":"done"}')
expect "onboarding needs login" 401 $(code $B/api/admin/onboarding)
echo "== sample controls"
expect "samples status" 200 $(code $CB $B/api/admin/samples); echo "  $(cat /tmp/body)"
expect "POST samples without Origin" 403 $(code $CB -X POST $B/api/admin/samples -H "$J" -d '{"action":"hide"}')
expect "hide samples" 200 $(code $CB -X POST $B/api/admin/samples -H "$J" -H "$O" -d '{"action":"hide"}'); echo "  $(cat /tmp/body)"
code $B/api/museum >/dev/null; [ "$(jq_ "len(d['items'])")" = "0" ] && pass "public museum empty when samples hidden" || fail "samples still public"
expect "show samples" 200 $(code $CB -X POST $B/api/admin/samples -H "$J" -H "$O" -d '{"action":"show"}')
dbq "await d.collection('museumitems').insertOne({type:'project',title:'REAL project',description:'',mediaUrl:'',parallaxSpeed:0.5,date:'2026-07',status:'published',order:0,isSample:false,metadata:{skills:[]}})"
code $B/api/museum >/dev/null; python3 -c "
import json;d=json.load(open('/tmp/body'))['items'];t=[i['title'] for i in d];print('  with real project (autohide on):',len(d));print('  titles:',t)
print('PASS: sample projects hidden once a real project exists' if 'REAL project' in t and not any(x.startswith('Sample project') for x in t) and any(x.startswith('Sample certificate') for x in t) else 'FAIL: autohide rule wrong')"
expect "turn autohide off" 200 $(code $CB -X POST $B/api/admin/samples -H "$J" -H "$O" -d '{"action":"autohide","value":false}'); echo "  $(cat /tmp/body)"
code $B/api/museum >/dev/null; [ "$(jq_ "len(d['items'])")" = "7" ] && pass "autohide off: samples + real = 7" || fail "autohide off count $(jq_ "len(d['items'])")"
echo "== delete needs fresh 2FA"
dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"
expect "delete samples with stale 2FA" 401 $(code $CB -X POST $B/api/admin/samples -H "$J" -H "$O" -d '{"action":"delete"}'); [ "$(jq_ "d.get('code')")" = "STEP_UP_REQUIRED" ] && pass "answer says STEP_UP_REQUIRED" || fail "no step-up code in answer"
expect "step-up with recovery code" 200 $(code $CB -X POST $B/api/admin/stepup -H "$J" -H "$O" -d "{\"code\":\"$REC1\"}")
expect "delete samples" 200 $(code $CB -X POST $B/api/admin/samples -H "$J" -H "$O" -d '{"action":"delete"}'); echo "  $(cat /tmp/body)"
code $B/api/museum >/dev/null; python3 -c "
import json;d=json.load(open('/tmp/body'))['items'];print('  after delete:',[i['title'] for i in d])"
dbq "const s=await d.collection('settings').findOne({});console.log('  profile after delete: name=[',s.profile.name,'] photo=[',s.profile.photoUrl,'] profileIsSample:',s.onboarding.profileIsSample)"
dbq "await d.collection('museumitems').deleteMany({})"
expect "samples status after delete" 200 $(code $CB $B/api/admin/samples); code $B/api/museum >/dev/null; [ "$(jq_ "len(d['items'])")" = "0" ] && pass "deleted samples are NOT re-created by themselves" || fail "samples came back"
expect "restore samples" 200 $(code $CB -X POST $B/api/admin/samples -H "$J" -H "$O" -d '{"action":"restore"}'); code $B/api/museum >/dev/null; [ "$(jq_ "len(d['items'])")" = "6" ] && pass "restore brings 6 samples back" || fail "restore count $(jq_ "len(d['items'])")"
echo "== config doctor"
expect "doctor checks" 200 $(code $CB $B/api/admin/doctor); python3 -c "
import json;d=json.load(open('/tmp/body'))['checks'];print('  ',[(c['id'],c['status']) for c in d])"
grep -q "$SERVICE_CRED_KEY" /tmp/body && fail "doctor leaked SERVICE_CRED_KEY" || pass "doctor output contains no secret values"
grep -q "27017" /tmp/body && fail "doctor leaked DB address" || pass "doctor output has no DB address"
expect "doctor needs login" 401 $(code $B/api/admin/doctor)
dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"
expect "test connection with stale 2FA" 401 $(code $CB -X POST $B/api/admin/doctor/test -H "$J" -H "$O" -d '{"kind":"mongodb","uri":"mongodb://127.0.0.1:27017/x"}')
code $CB -X POST $B/api/admin/stepup -H "$J" -H "$O" -d "{\"code\":\"$REC2\"}" >/dev/null
expect "test: bad format" 200 $(code $CB -X POST $B/api/admin/doctor/test -H "$J" -H "$O" -d '{"kind":"mongodb","uri":"hello world"}'); echo "  $(jq_ "d['reason']") | $(jq_ "d['message'][:70]")"
expect "test: unreachable server (takes ~5s)" 200 $(code $CB -X POST $B/api/admin/doctor/test -H "$J" -H "$O" -d '{"kind":"mongodb","uri":"mongodb://admin:pwSECRET123@127.0.0.1:1/x"}'); echo "  $(jq_ "d['reason']") | $(jq_ "d['message'][:70]")"
grep -q "pwSECRET123" /tmp/body && fail "test answer echoed the password" || pass "test answer does not echo the password"
expect "test: working database" 200 $(code $CB -X POST $B/api/admin/doctor/test -H "$J" -H "$O" -d '{"kind":"mongodb","uri":"mongodb://127.0.0.1:27017/vhqp2b"}'); [ "$(jq_ "d['ok']")" = "True" ] && pass "working URI reported OK" || fail "working URI failed: $(cat /tmp/body)"
expect "test: cloudinary bad values" 200 $(code $CB -X POST $B/api/admin/doctor/test -H "$J" -H "$O" -d '{"kind":"cloudinary","cloudName":"demo-none","apiKey":"123456789","apiSecret":"abcdefgh12"}'); echo "  $(jq_ "(d['ok'],d['reason'])")"
expect "test: invalid payload" 200 $(code $CB -X POST $B/api/admin/doctor/test -H "$J" -H "$O" -d '{"kind":"nope"}'); [ "$(jq_ "d['ok']")" = "False" ] && pass "invalid payload refused gently" || fail "invalid payload accepted"
grep -q "pwSECRET123" /tmp/p2b-app.log && fail "password found in server log" || pass "password never reached the server log"
grep -iE "error" /tmp/p2b-app.log | head -3 | cut -c1-200
python3 $ROOT/tests/http/killport.py $PORT >/dev/null
