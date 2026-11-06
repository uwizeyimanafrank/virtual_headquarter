#!/bin/bash
# P09 vault API: only ciphertext is stored, step-up and audit are enforced. Needs Node 22 (runs lib/vault-crypto.ts directly).
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PORT=4044; B=http://127.0.0.1:$PORT; O="Origin: $B"; J='Content-Type: application/json'
PASS='Correct-Horse-Battery-9'; S=test-office-9x7k
export MONGODB_URI=mongodb://127.0.0.1:27017/vhqvault SESSION_SECRET=test-secret-not-real
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
CB="-b /tmp/jvt -c /tmp/jvt"; P(){ code $CB -X "$1" "$B$2" -H "$J" -H "$O" ${3:+-d "$3"}; }
stale(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date(Date.now()-20*60000)}})"; }
fresh(){ dbq "await d.collection('sessions').updateMany({},{\$set:{twoFactorAt:new Date()}})"; }
audits(){ dbq "console.log(await d.collection('auditlogs').countDocuments({event:'$1'}))"; }
# makes a real encrypted payload with the real browser module: node enc.mjs <passphrase> <text>
cat > /tmp/vault-enc.mjs << 'JS'
import { encryptText, decryptText } from "file:///__ROOT__/lib/vault-crypto.ts";
const [mode, pass, arg] = process.argv.slice(2);
if (mode === "enc") process.stdout.write(await encryptText(pass, arg));
else { try { process.stdout.write(await decryptText(pass, arg)); } catch (e) { process.stdout.write("ERR:" + e.name); } }
JS
sed -i "s#__ROOT__#$ROOT#" /tmp/vault-enc.mjs
enc(){ node --no-warnings --experimental-strip-types /tmp/vault-enc.mjs enc "$1" "$2"; }
dec(){ node --no-warnings --experimental-strip-types /tmp/vault-enc.mjs dec "$1" "$2"; }
MARK="MY-SECRET-STRIPE-KEY-sk_live_12345"; VP="vault-pass-correct-horse"
LOG=/tmp/vault-app.log
(setsid nohup npx next start -p $PORT > $LOG 2>&1 &); sleep 6

echo "== not signed in"
expect "no login: open" 401 $(code $B/api/admin/vault)
expect "no login: add" 401 $(code -X POST $B/api/admin/vault -H "$J" -H "$O" -d '{}')
expect "no login: delete" 401 $(code -X DELETE $B/api/admin/vault/aaaaaaaaaaaaaaaaaaaaaaaa -H "$O")
rm -f /tmp/jvt; code -c /tmp/jvt -X POST $B/api/admin/login -H "$J" -H "$O" -d "{\"email\":\"me@x.co\",\"password\":\"$PASS\"}" >/dev/null
code -b /tmp/jvt -X POST $B/api/admin/2fa/enroll -H "$O" >/dev/null
SECRET=$(jq_ "d['secret']")
code -b /tmp/jvt -c /tmp/jvt -X POST $B/api/admin/2fa/confirm -H "$J" -H "$O" -d "{\"code\":\"$(node "$ROOT/tests/http/gen-code.mjs" $SECRET 0)\"}" >/dev/null
expect "no Origin (CSRF): add" 403 $(code $CB -X POST $B/api/admin/vault -H "$J" -d '{}')

echo "== needs a fresh authenticator code"
PAY=$(enc "$VP" "$MARK")
stale
refused "stale code: open" $(code $CB $B/api/admin/vault)
refused "stale code: add" $(P POST /api/admin/vault "{\"payload\":$(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$PAY")}")
refused "stale code: delete" $(code $CB -X DELETE $B/api/admin/vault/aaaaaaaaaaaaaaaaaaaaaaaa -H "$O")

echo "== adding"
fresh
body(){ python3 -c "import json,sys;print(json.dumps({'payload':sys.argv[1]}))" "$1"; }
expect "valid encrypted entry" 201 $(P POST /api/admin/vault "$(body "$PAY")")
ID=$(jq_ "d['id']")
expect "plain text is refused" 400 $(P POST /api/admin/vault "$(body "$MARK")")
expect "JSON that is not our format is refused" 400 $(P POST /api/admin/vault "$(body "{\"name\":\"stripe\",\"value\":\"$MARK\"}")")
EXTRA=$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);d['label']='readable name';print(json.dumps(d))" "$PAY")
expect "extra readable field is refused" 400 $(P POST /api/admin/vault "$(body "$EXTRA")")
OLDV=$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);d['v']=2;print(json.dumps(d))" "$PAY")
expect "unknown version is refused" 400 $(P POST /api/admin/vault "$(body "$OLDV")")
WEAK=$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);d['kdf']['iterations']=1000;print(json.dumps(d))" "$PAY")
expect "weak iteration count is refused" 400 $(P POST /api/admin/vault "$(body "$WEAK")")
expect "missing payload" 400 $(P POST /api/admin/vault '{}')
expect "payload is not a string" 400 $(P POST /api/admin/vault '{"payload":{"v":1}}')
python3 -c "print('{\"payload\":\"'+'A'*200000+'\"}')" > /tmp/vault-big.json   # file, because one command-line argument cannot be this long
BC=$(code $CB -X POST $B/api/admin/vault -H "$J" -H "$O" --data-binary @/tmp/vault-big.json); case "$BC" in 400|413|000) pass "oversized body refused ($BC)";; *) fail "oversized body ($BC)";; esac

echo "== the database holds no readable text"
dbq "const docs=await d.collection('vaultentries').find({}).toArray();console.log(docs.length+'|'+Object.keys(docs[0]).sort().join(',')+'|'+JSON.stringify(docs).includes('$MARK')+'|'+JSON.stringify(docs).includes('$VP'))" > /tmp/dbout
eqv "one entry, only expected fields, no secret, no passphrase" "1|__v,_id,createdAt,payload,updatedAt|false|false" "$(cat /tmp/dbout)"
eqv "payload stored exactly as uploaded" "$PAY" "$(dbq "console.log((await d.collection('vaultentries').findOne({})).payload)")"
eqv "one vault_change audit" 1 "$(audits vault_change)"
eqv "no plaintext or passphrase in ANY collection of the whole database" "false|false" "$(dbq "const names=(await d.listCollections().toArray()).map(c=>c.name);let all='';for(const n of names){all+=JSON.stringify(await d.collection(n).find({}).toArray())};console.log(all.includes('$MARK')+'|'+all.includes('$VP'))")"

echo "== opening"
fresh
HDR=$(curl -s -D - -o /tmp/body $CB $B/api/admin/vault -H "$O" | tr -d '\r' | grep -i '^cache-control')
echo "$HDR" | grep -qi "no-store" && pass "open is no-store" || fail "open is no-store ($HDR)"
eqv "one entry back" 1 "$(jq_ "len(d['entries'])")"
eqv "same id" "$ID" "$(jq_ "d['entries'][0]['id']")"
grep -q "$MARK" /tmp/body && fail "plaintext in the open response" || pass "no plaintext in the open response"
eqv "audit vault_open written" 1 "$(audits vault_open)"
jq_ "d['entries'][0]['payload']" > /tmp/got-payload
eqv "right passphrase decrypts in the browser module" "$MARK" "$(dec "$VP" "$(cat /tmp/got-payload)")"
eqv "wrong passphrase reveals nothing" "ERR:VaultCryptoError" "$(dec "wrong-pass" "$(cat /tmp/got-payload)")"

echo "== limit"
dbq "const p=(await d.collection('vaultentries').findOne({})).payload;const n=199;await d.collection('vaultentries').insertMany(Array.from({length:n},()=>({payload:p,createdAt:new Date(),updatedAt:new Date()})))"
expect "201st entry refused" 400 $(P POST /api/admin/vault "$(body "$PAY")")
dbq "await d.collection('vaultentries').deleteMany({_id:{\$ne:new OID('$ID')}})"

echo "== deleting"
fresh
expect "bad id" 404 $(code $CB -X DELETE $B/api/admin/vault/not-an-id -H "$O")
stale
refused "stale code: delete" $(code $CB -X DELETE $B/api/admin/vault/$ID -H "$O")
fresh
expect "delete" 200 $(code $CB -X DELETE $B/api/admin/vault/$ID -H "$O")
expect "delete again" 404 $(code $CB -X DELETE $B/api/admin/vault/$ID -H "$O")
eqv "delete audited" 1 "$(audits delete)"

echo "== server log"
grep -q "$MARK" $LOG && fail "plaintext in the server log" || pass "no plaintext in the server log"
grep -q "$VP" $LOG && fail "passphrase in the server log" || pass "no passphrase in the server log"
python3 "$ROOT/tests/http/killport.py" $PORT >/dev/null
