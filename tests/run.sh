#!/usr/bin/env bash
# همه‌ی تست‌ها: ./tests/run.sh      فقط چندتا: ./tests/run.sh autoexec gate      با خزنده‌ی کامل: FULL=1 ./tests/run.sh
# سرور ایستا روی 8899 را خودش بالا می‌آورد (اگر بالا نباشد). خروجی غیرصفر یعنی دست‌کم یک تست رد شد.
set -u
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PAR="${PAR:-4}"
if ! curl -s -o /dev/null "http://localhost:8899/index.html"; then
  (cd "$ROOT" && python3 -m http.server 8899 >/dev/null 2>&1 &) ; SRV=1
  for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:8899/index.html" && break; sleep 0.3; done
fi
if [ "$#" -gt 0 ]; then LIST="$*"; else
  LIST=$(ls *.test.js *.test.mjs | sed -E 's/\.test\.m?js$//' | grep -v '^crawl$')
  [ "${FULL:-}" = "1" ] && LIST="$LIST crawl"
fi
OUTDIR="${TEST_OUT:-${TMPDIR:-/tmp}/signaldesk-tests}"; mkdir -p "$OUTDIR/logs"; export TEST_OUT="$OUTDIR"
run(){
  t="$1"; f="$t.test.js"; [ -f "$f" ] || f="$t.test.mjs"
  log="$TEST_OUT/logs/$t.log"
  timeout 300 node "$f" >"$log" 2>&1; code=$?
  n=$(grep -c "❌\|PAGEERROR\|^✗" "$log")
  if [ "$code" != "0" ] || [ "$n" != "0" ]; then echo "✗ $t (خطا: $n، کد خروج: $code) — $log"; grep -m5 "❌\|PAGEERROR\|Error" "$log" | sed 's/^/    /'; return 1; fi
  echo "✓ $t"
}
export -f run
echo $LIST | tr ' ' '\n' | xargs -P "$PAR" -I{} bash -c 'run {}' > "$TEST_OUT/summary.txt"; st=$?
sort "$TEST_OUT/summary.txt"
fail=$(grep -c "^✗" "$TEST_OUT/summary.txt")
echo "— $(grep -c '^✓' "$TEST_OUT/summary.txt") درست، $fail رد"
[ "$fail" = "0" ]
