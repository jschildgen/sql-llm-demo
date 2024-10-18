<?php

require_once("openai.php");

function process ($query) {
    $result = openai(createprompt($query));
    //$result = file_get_contents("openai.resulttext");

    $tmp = explode("```", $result);
    $dbquery = $tmp[1];
    if (substr($dbquery, 0, 3) === "sql") {
        $dbquery = substr($dbquery, 3);
    }
    
    $db = pg_connect("dbname=datahub user=datahub");
    $res = pg_query($db, $dbquery);
    $data = pg_fetch_all($res, PGSQL_NUM);
    $text = "";
    if (sizeof($data) > 1) {
        foreach ($data AS $row) {
            foreach ($row AS $field) {
                $text .= $field . " ";
            }
            $text .= " and ";
        }
        $text .= "that is all.";
    } else if (sizeof($data) == 1) {
        foreach ($data[0] AS $field) {
            $text .= $field . " ";
        }
    } else {
        $text = "empty";
    }

//	return "Your question was: ".$query." and the result is: ".$text;
	return $text;
}

function getschema () {
    $schema = `./schema.sh`;

    return $schema;
}

function createprompt ($query) {
    $schema = getschema();
    $prompt = "Assume we have a database schema created with the following commands:\n".
              $schema.
              "Try to infer the semantics from this schema. Which SQL command for PostgreSQL could answer the following question: ".$query.".\n".
              "Only query fields that you would tell a human person asking you this question, not just all fields. Perform case insensitive string comparisons. The result should consist of a single text field with a human comprehensible answer sentence that also repeats the whole question. You only need to show the query, no explanations.";

    return $prompt;
}

/* Alexa Skill Boilerplate */

$rawdata = file_get_contents("php://input");
$data = json_decode($rawdata);
file_put_contents("/tmp/datahub_alexa", "\n\n\n\n\n\n==================================   REQUEST   =================================\n\n", FILE_APPEND);
file_put_contents("/tmp/datahub_alexa", print_r($data, true), FILE_APPEND);

$query = $data->request->intent->slots->query->value;

header("Content-type: application/json;charset=UTF-8");

$txt = process($query);

$reply =
array(
	"version" => "1.0",
	"response" => array(
		"outputSpeech" => array(
			"type" => "PlainText",
			"text" => "$txt",
			"ssml" => "<speak>$txt</speak>"
			),
		"shouldEndSession" => true
	)
);

echo json_encode($reply);
file_put_contents("/tmp/datahub_alexa", "\n\n=================================   RESULT   ===================================\n\n", FILE_APPEND);
file_put_contents("/tmp/datahub_alexa", print_r($reply, true));

?>
