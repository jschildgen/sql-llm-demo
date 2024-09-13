<?php
require_once('config.php');

$postData = json_decode(file_get_contents('php://input'), true);
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
    echo json_encode(['error' => 'OpenAI API Error']);
} else {
    echo $result;
}
?>
