<?php
declare(strict_types=1);

const LIMITS = [
    'name' => 100,
    'business' => 150,
    'email' => 254,
    'phone' => 40,
    'website' => 300,
    'problem' => 100,
    'message' => 5000,
];

const REQUIRED = [
    'project' => ['name', 'business', 'email'],
    'lead-response' => ['name', 'business', 'email'],
    'teardown' => ['website', 'email'],
];

const LABELS = [
    'name' => 'your name',
    'business' => 'your business name',
    'email' => 'your email address',
    'website' => 'your website address',
];

const MIN_SECONDS = 3;

date_default_timezone_set('America/Chicago');

$settings = require __DIR__ . '/settings.php';

function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

function one_line(string $value): string
{
    return trim((string)preg_replace('/[\r\n\t]+/', ' ', $value));
}

function is_open(string $value): bool
{
    return $value === '' || str_starts_with($value, '[');
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function page(int $status, string $title, string $bodyHtml): never
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex');
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex">'
        . '<title>' . e($title) . '</title>'
        . '<link rel="stylesheet" href="/assets/css/tokens.css">'
        . '<link rel="stylesheet" href="/assets/css/base.css">'
        . '<link rel="stylesheet" href="/assets/css/components.css">'
        . '</head><body><main id="main" class="band"><div class="container flow">'
        . $bodyHtml
        . '</div></main></body></html>';
    exit;
}

function back_link(): string
{
    $referer = (string)($_SERVER['HTTP_REFERER'] ?? '');
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    $path = '/start/';
    if ($referer !== '' && parse_url($referer, PHP_URL_HOST) === $host) {
        $path = (string)(parse_url($referer, PHP_URL_PATH) ?: '/start/');
    }
    return '<p><a class="button" href="' . e($path) . '">Go back to the form</a></p>';
}

function contact_fallback(array $settings): string
{
    $ways = [];
    if (!is_open($settings['phone_e164'] ?? '')) {
        $ways[] = 'call <a href="tel:' . e($settings['phone_e164']) . '">' . e($settings['phone_display']) . '</a>';
    }
    if (!is_open($settings['email'] ?? '')) {
        $ways[] = 'email <a href="mailto:' . e($settings['email']) . '">' . e($settings['email']) . '</a>';
    }
    return $ways ? '<p>You can also ' . implode(' or ', $ways) . '.</p>' : '';
}

function thanks(): never
{
    header('Location: /start/thanks/', true, 303);
    exit;
}

function smtp_send(array $config, string $to, string $replyTo, string $subject, string $body): void
{
    $secure = $config['smtp_secure'] ?? 'ssl';
    $scheme = $secure === 'ssl' ? 'ssl://' : 'tcp://';
    $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $socket = @stream_socket_client(
        $scheme . $config['smtp_host'] . ':' . (int)$config['smtp_port'],
        $errno,
        $errstr,
        15,
        STREAM_CLIENT_CONNECT,
        $context
    );
    if (!$socket) {
        throw new RuntimeException("Could not connect to SMTP server: $errstr");
    }
    stream_set_timeout($socket, 15);

    $expect = static function (array $codes) use ($socket): void {
        do {
            $line = fgets($socket, 1024);
            if ($line === false) {
                throw new RuntimeException('SMTP server closed the connection');
            }
        } while (isset($line[3]) && $line[3] === '-');
        if (!in_array((int)substr($line, 0, 3), $codes, true)) {
            throw new RuntimeException('SMTP error: ' . trim($line));
        }
    };
    $send = static function (string $command) use ($socket): void {
        fwrite($socket, $command . "\r\n");
    };

    $helo = (string)($_SERVER['SERVER_NAME'] ?? 'localhost');
    $expect([220]);
    $send("EHLO $helo");
    $expect([250]);

    if ($secure === 'starttls') {
        $send('STARTTLS');
        $expect([220]);
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('STARTTLS failed');
        }
        $send("EHLO $helo");
        $expect([250]);
    }

    if (($config['smtp_user'] ?? '') !== '') {
        $send('AUTH LOGIN');
        $expect([334]);
        $send(base64_encode($config['smtp_user']));
        $expect([334]);
        $send(base64_encode($config['smtp_pass']));
        $expect([235]);
    }

    $from = $config['from_email'];
    $encode = static fn(string $text): string => '=?UTF-8?B?' . base64_encode($text) . '?=';
    $headers = [
        'Date: ' . date(DATE_RFC2822),
        'From: ' . $encode($config['from_name'] ?? 'Website') . " <$from>",
        "To: <$to>",
        "Reply-To: <$replyTo>",
        'Subject: ' . $encode($subject),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($from, '@') ?: '@localhost', 1) . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    $message = implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($body), 76, "\r\n"));

    $send("MAIL FROM:<$from>");
    $expect([250]);
    $send("RCPT TO:<$to>");
    $expect([250, 251]);
    $send('DATA');
    $expect([354]);
    $send($message . "\r\n.");
    $expect([250]);
    $send('QUIT');
    fclose($socket);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    page(405, 'Use the form', '<h1>Use the form to send a message</h1>' . back_link());
}

$type = field('form_type');
if (!isset(REQUIRED[$type])) {
    page(400, 'Something went wrong', '<h1>Something went wrong</h1><p>That form type isn\'t one I recognize.</p>' . back_link());
}

$started = (int)field('started');
$elapsed = (int)round(microtime(true) * 1000) - $started;
if (field('fax') !== '' || $started === 0 || $elapsed < MIN_SECONDS * 1000) {
    thanks();
}

$data = [];
foreach (array_keys(LIMITS) as $name) {
    $value = field($name);
    $data[$name] = $name === 'message' ? $value : one_line($value);
}
$data['teardown'] = field('teardown') === 'yes' ? 'yes' : '';

$problems = [];
foreach (REQUIRED[$type] as $name) {
    if ($data[$name] === '') {
        $problems[] = 'Enter ' . LABELS[$name] . '.';
    }
}
foreach (LIMITS as $name => $max) {
    if (mb_strlen($data[$name]) > $max) {
        $problems[] = 'Shorten ' . (LABELS[$name] ?? $name) . " to $max characters or fewer.";
    }
}
if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $problems[] = 'Enter an email address like name@example.com.';
}
if ($data['website'] !== '') {
    $site = preg_match('#^https?://#i', $data['website']) ? $data['website'] : 'https://' . $data['website'];
    if (!filter_var($site, FILTER_VALIDATE_URL)) {
        $problems[] = 'Enter a web address like example.com.';
    } else {
        $data['website'] = $site;
    }
}
if ($data['phone'] !== '' && strlen((string)preg_replace('/\D/', '', $data['phone'])) < 10) {
    $problems[] = 'Enter a 10-digit phone number.';
}

if ($problems) {
    $items = implode('', array_map(static fn($p) => '<li>' . e($p) . '</li>', $problems));
    page(422, 'Check the form', '<h1>Check these and try again</h1><ul>' . $items . '</ul>' . back_link());
}

$configPath = getenv('CONTACT_CONFIG') ?: dirname(__DIR__, 2) . '/contact-config.php';
$config = is_readable($configPath) ? require $configPath : null;
$to = (string)($settings['to'] ?? '');

if (!is_array($config) || ($config['smtp_host'] ?? '') === '' || ($config['from_email'] ?? '') === '' || is_open($to)) {
    error_log('contact.php: mail is not configured');
    page(503, 'Form not connected yet', '<h1>The form isn\'t connected yet</h1><p>Your message wasn\'t sent. Sorry about that.</p>' . contact_fallback($settings));
}

$titles = ['project' => 'New project', 'lead-response' => 'Lead Response setup call', 'teardown' => 'Teardown request'];
$who = $data['business'] !== '' ? $data['business'] : $data['website'];
$subject = $titles[$type] . ': ' . $who;

$lines = ["Form: {$titles[$type]}", ''];
foreach (['name' => 'Name', 'business' => 'Business', 'email' => 'Email', 'phone' => 'Phone', 'website' => 'Website', 'problem' => "What's not working"] as $key => $label) {
    if ($data[$key] !== '') {
        $lines[] = "$label: {$data[$key]}";
    }
}
if ($data['teardown'] === 'yes') {
    $lines[] = 'Wants a free teardown: yes';
}
if ($data['message'] !== '') {
    $lines[] = '';
    $lines[] = 'Message:';
    $lines[] = $data['message'];
}
$lines[] = '';
$lines[] = 'Sent from ' . ($settings['site'] ?? 'the website') . ' on ' . date('M j, Y g:i A T');

try {
    smtp_send($config, $to, $data['email'], $subject, implode("\n", $lines));
} catch (Throwable $error) {
    error_log('contact.php: ' . $error->getMessage());
    page(502, 'Message not sent', '<h1>Your message didn\'t go through</h1><p>Something went wrong on my end, not yours.</p>' . contact_fallback($settings) . back_link());
}

thanks();
