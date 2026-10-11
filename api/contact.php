<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method not allowed');
}

$field = static fn(string $name): string => trim((string)($_POST[$name] ?? ''));

$type = $field('form_type');
$started = (int)$field('started');
$nowMs = (int)round(microtime(true) * 1000);

$errors = [];

if ($field('fax') !== '') {
    $errors[] = 'trap';
}
if ($started === 0 || $nowMs - $started < 3000) {
    $errors[] = 'too-fast';
}

$required = [
    'project' => ['name', 'business', 'email'],
    'lead-response' => ['name', 'business', 'email'],
    'teardown' => ['website', 'email'],
];

if (!isset($required[$type])) {
    $errors[] = 'type';
} else {
    foreach ($required[$type] as $name) {
        if ($field($name) === '') {
            $errors[] = 'missing-' . $name;
        }
    }
}

if ($field('email') !== '' && !filter_var($field('email'), FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'email';
}

if ($errors) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Something was missing. Go back and check the form.\n");
}

header('Location: /start/thanks/', true, 303);
exit;
