<?php
require_once('config.php');

/* Function: openai (userMessage)
   Send a message to OpenAI and return the result text as string.
   Param:   userMessage - The prompt sent to OpenAI
   Returns: The response from OpenAI
 */
function openai ($userMessage) {
    global $API_KEY;

    $apiUrl = 'https://api.openai.com/v1/chat/completions';
    $data = [
        'model' => 'gpt-4o-mini',
        'messages' => [
            [
                'role' => 'user',
                'content' => $userMessage
            ]
        ],
        'max_tokens' => 1500
    ];

    $options = [
        'http' => [
            'header'  => "Content-Type: application/json\r\n" .
                "Authorization: Bearer $API_KEY\r\n",
        'method'  => 'POST',
        'content' => json_encode($data),
        ]
    ];
    file_put_contents("/tmp/datahub_openai", "\n\n\n\n\n\n==================================   REQUEST   =================================\n\n", FILE_APPEND);
    file_put_contents("/tmp/datahub_openai", print_r($options, true));

    $context  = stream_context_create($options);
    $result = file_get_contents($apiUrl, false, $context);

    if ($result === FALSE) {
        $error = error_get_last();
        return json_encode(['error' => 'OpenAI API Error', 'details' => $error]);
    }

    file_put_contents("/tmp/datahub_openai", "\n\n=================================   RESULT   ===================================\n\n", FILE_APPEND);
    file_put_contents("/tmp/datahub_openai", $result, FILE_APPEND);
    $result = json_decode($result);

    $answer = $result->choices[0]->message->content;

    return $answer;
}
?>
