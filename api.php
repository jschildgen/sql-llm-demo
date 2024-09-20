<?php
require_once('config.php');

$json = file_get_contents('php://input');
$lastBracePos = strrpos($json, '}');
if ($lastBracePos !== false) {
    $json = substr($json, 0, $lastBracePos + 1); // +1, um das '}' einzuschließen
}
$postData = json_decode($json, true);
$userMessage = $postData['q'];

$apiUrl = 'https://api.openai.com/v1/chat/completions';
$data = [
    'model' => 'gpt-4o-mini',
    'messages' => [
        [
            'role' => 'user',
            'content' => $userMessage
        ]
    ],
    'max_tokens' => 150
];

$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n" .
                     "Authorization: Bearer $API_KEY\r\n",
        'method'  => 'POST',
        'content' => json_encode($data),
    ]
];

$context  = stream_context_create($options);
$result = file_get_contents($apiUrl, false, $context);

if ($result === FALSE) {
  $error = error_get_last();
  echo json_encode(['error' => 'OpenAI API Error', 'details' => $error]);
} else {
    echo $result;
}
?>
