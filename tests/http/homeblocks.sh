#!/bin/bash
# P11 Home layout API: login needed, strict validation, order/switches/text saved, public Home still works, reset.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4047; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqblocks SESSION_SECRET=test-secret-not-real
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
CB="-b /tmp/jbt -c /tmp/jbt"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }
fresh(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"; }
audits(){ dbq "console.log(await d.collection('auditlogs').countDocuments({event:'$1'}))"; }
LOG=/tmp/blocks-app.log
(setsid nohup npx next start -p $PORT > $LOG 2>&1 &); sleep 6



echo "== not signed in"
expect "no login: read" 401 $(code $B/api/admin/home-blocks)
expect "no login: save" 401 $(code -X PUT $B/api/admin/home-blocks -H "$J" -H "$O" -d '{"blocks":[]}')
expect "no login: reset" 401 $(code -X DELETE $B/api/admin/home-blocks -H "$O")
rm -f /tmp/jbt; code -c /tmp/jbt -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jbt -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null
SECRET=$(jq_ "d['secret']")
code -b /tmp/jbt -c /tmp/jbt -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node "$ROOT/tests/http/gen-code.mjs" $SECRET 0)\"}" >/dev/null
CB="-b /tmp/jbt -c /tmp/jbt"
expect "no Origin (CSRF): save" 403 $(code $CB -X PUT $B/api/admin/home-blocks -H "$J" -d '{"blocks":[{"key":"hero","enabled":true}]}')

echo "== reading"
expect "read" 200 $(code $CB $B/api/admin/home-blocks)
eqv "11 blocks, hero first" "11|hero" "$(jq_ "str(len(d['blocks']))+'|'+d['blocks'][0]['key']")"
eqv "hero is on and required" "True|True" "$(jq_ "str(d['blocks'][0]['enabled'])+'|'+str(d['blocks'][0]['required'])")"
eqv "only the hero is built so far" "hero" "$(jq_ "','.join(b['key'] for b in d['blocks'] if b['ready'])")"
eqv "every block explains itself" 0 "$(jq_ "len([b for b in d['blocks'] if len(b['description'])<10 or len(b['label'])<3])")"

echo "== refusals (nothing may be saved)"
expect "not JSON" 400 $(P PUT /api/admin/home-blocks 'hello')
expect "no blocks" 400 $(P PUT /api/admin/home-blocks '{}')
expect "empty list" 400 $(P PUT /api/admin/home-blocks '{"blocks":[]}')
expect "unknown block" 400 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"nope","enabled":true}]}')
expect "same block twice" 400 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"hero","enabled":true},{"key":"hero","enabled":true}]}')
expect "hero cannot be switched off" 400 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"hero","enabled":false}]}')
expect "on/off missing" 400 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"stats"}]}')
expect "unknown field" 400 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"stats","enabled":true,"content":{"evil":"x"}}]}')
expect "text too long" 400 $(P PUT /api/admin/home-blocks "{\"blocks\":[{\"key\":\"stats\",\"enabled\":true,\"content\":{\"title\":\"$(python3 -c "print('x'*61)")\"}}]}")
expect "text is not text" 400 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"stats","enabled":true,"content":{"title":5}}]}')
python3 -c "print('{\"blocks\":[{\"key\":\"hero\",\"enabled\":true,\"content\":{\"x\":\"'+'A'*70000+'\"}}]}')" > /tmp/blocks-big.json
BC=$(code $CB -X PUT $B/api/admin/home-blocks -H "$J" -H "$O" --data-binary @/tmp/blocks-big.json); case "$BC" in 400|413|000) pass "oversized body refused ($BC)";; *) fail "oversized body ($BC)";; esac
eqv "nothing was saved by the refusals" "0" "$(dbq "const s=await d.collection('settings').findOne({key:'main'});console.log(s&&s.homeBlocks?s.homeBlocks.length:0)")"

echo "== saving"
expect "save order, switch and text" 200 $(P PUT /api/admin/home-blocks '{"blocks":[{"key":"hire","enabled":true,"content":{"title":"  Hire Frank  ","text":"Tell me what you need."}},{"key":"hero","enabled":true},{"key":"stats","enabled":false},{"key":"now","enabled":true}]}')
eqv "the answer already shows the new order" "hire,hero,stats,now" "$(jq_ "','.join(b['key'] for b in d['blocks'][:4])")"
expect "read again" 200 $(code $CB $B/api/admin/home-blocks)
eqv "order kept (blocks not mentioned follow in the built-in order)" "hire,hero,stats,now,whatIBuild" "$(jq_ "','.join(b['key'] for b in d['blocks'][:5])")"
eqv "text saved and trimmed, the other field keeps its default" "Hire Frank|Tell me what you need.|Hire me" "$(jq_ "[b for b in d['blocks'] if b['key']=='hire'][0]['content']['title']+'|'+[b for b in d['blocks'] if b['key']=='hire'][0]['content']['text']+'|'+[b for b in d['blocks'] if b['key']=='hire'][0]['content']['button']")"
eqv "switch kept" "False" "$(jq_ "[b for b in d['blocks'] if b['key']=='stats'][0]['enabled']")"
eqv "stored in the database" "4" "$(dbq "console.log((await d.collection('settings').findOne({key:'main'})).homeBlocks.length)")"
eqv "settings_change audited" 1 "$(audits settings_change)"
echo "== public Home still works with a custom layout"
expect "home page" 200 $(code $B/)
eqv "the hero is still there" "1" "$(grep -c 'Discipline over luck' /tmp/body)"

echo "== resetting"
expect "reset" 200 $(code $CB -X DELETE $B/api/admin/home-blocks -H "$O")
eqv "back to the built-in order" "hero,stats,whatIBuild" "$(jq_ "','.join(b['key'] for b in d['blocks'][:3])")"
eqv "database list is empty again" "0" "$(dbq "console.log((await d.collection('settings').findOne({key:'main'})).homeBlocks.length)")"
eqv "reset audited too" 2 "$(audits settings_change)"

echo "== server log"
grep -q "Traceback\|TypeError\|Unhandled" $LOG && fail "errors in the server log" || pass "no errors in the server log"
python3 "$ROOT/tests/http/killport.py" $PORT >/dev/null
