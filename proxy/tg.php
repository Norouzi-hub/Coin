<?php
/* واسط شخصی میز سیگنال — برای هاست‌هایی که PHP دارند
 *
 * نصب: این فایل را در public_html بگذار، بعد در تنظیمات برنامه، کادر «واسط شخصی» این را بنویس:
 *   https://<دامنه-تو>/tg.php?url={url}
 *
 * نکته‌ی مهم: هاست باید خودش به t.me دسترسی داشته باشد. هاست‌های داخل ایران معمولاً ندارند،
 * چون t.me از همان‌جا هم بسته است. اگر هاستت ایرانی است، نسخه‌ی worker.js را استفاده کن.
 */

$ALLOW = [
  't.me',
  'api.binance.com', 'api.mexc.com', 'api.gateio.ws',
  'www.okx.com', 'api.kucoin.com', 'api.bitget.com',
];

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,OPTIONS');
header('Access-Control-Allow-Headers: *');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$raw = isset($_GET['url']) ? $_GET['url'] : '';
if ($raw === '') { fail(400, 'پارامتر url لازم است'); }

$p = parse_url($raw);
if (!$p || !isset($p['scheme'], $p['host']) || strtolower($p['scheme']) !== 'https') {
  fail(400, 'فقط آدرس https قبول است');
}

$host = strtolower($p['host']);
$ok = false;
foreach ($ALLOW as $h) {
  if ($host === $h || substr($host, -strlen('.' . $h)) === '.' . $h) { $ok = true; break; }
}
if (!$ok) { fail(403, 'این میزبان مجاز نیست: ' . $host); }

$ch = curl_init($raw);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS      => 5,
  CURLOPT_TIMEOUT        => 20,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_ENCODING       => '',
  // t.me بدون این هدرها نسخه‌ی خالی یا صفحه‌ی «برنامه را باز کن» می‌دهد
  CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          . '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  CURLOPT_HTTPHEADER     => [
    'Accept: text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language: en-US,en;q=0.9',
  ],
]);

$body = curl_exec($ch);
if ($body === false) { $e = curl_error($ch); curl_close($ch); fail(502, 'به مقصد نرسید: ' . $e); }

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type   = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

http_response_code($status ?: 502);
header('Content-Type: ' . ($type ?: 'text/plain; charset=utf-8'));
echo $body;

function fail($code, $msg) {
  http_response_code($code);
  header('Content-Type: text/plain; charset=utf-8');
  echo $msg;
  exit;
}
