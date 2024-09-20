DEBUG = true;

PREFIX = "The MySQL database schema is the following: @@@SCHEMA@@@. Answer with a single JSON object with one field: query:... Nothing else! In this query field, write the SQL query for the following: ";

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

const recognition = new SpeechRecognition();
recording = false;
recorded_text = [];

recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

$(document).ready(function() {
  let tables = "";

  $("#pma_navigation").append('<button class="btn btn-danger button" style="border-radius:50%; font-size:110px; z-index:99999; position:fixed; bottom:10px; left:10px; width:160px; height:160px; cursor:pointer;" id="voicebtn">🎤</button>');

  function log(msg, data="", level="log", reset_time=false) {
    if (!DEBUG && level=="debug") return;
    if (level == "debug") { level = "log"; }
    console[level](msg, data);
  }

  $("#voicebtn").click(function() {
    if (recording) {
      recording = false;
      log("... stopped.", "", "log", true);
      recognition.stop();
      $('#voicebtn').text('🎤');
      return;
    }
    $('#log').empty();
    recording = true;
    recognition.start();
    log("Listening...", "", "log", true);
    $('#voicebtn').text('◾');

    let dbname = $("input[name=db]").val();

    $.get("http://localhost/phpMyAdmin/index.php?route=/database/data-dictionary&db="+dbname, 
      function(data) { 
        tables = get_tables(data);
      });
      return false;
  });

  recognition.onresult = function(event) {
    transcript = event.results[event.results.length-1][0].transcript;
    log("Result "+(event.results.length-1)+": ", transcript, "debug");
    recorded_text.push(transcript);
  };
  
  recognition.onend = function() {
    transcript = recorded_text.join(" ");
    log("Transcript: ", transcript);
    Functions.setQuery("-- "+transcript+"\n\n");
    recorded_text = [];
    use_ai(transcript, PREFIX.replace("@@@SCHEMA@@@", tables), function(json) {
      log("Query: ", json.query);
      $("#sqlquery").text(json.query);
      Functions.setQuery("-- "+transcript+"\n\n"+json.query);
    });
  }

  recognition.onerror = function(event) {
    log("Error: ", event.error, "error");
  }
  
  function use_ai(inputText, prefix="", callback) {
    log("AI Request: ", prefix+" \n"+inputText, "debug");
    $.ajax({
      url: 'http://localhost/t63/crud-invaders/api.php',
      type: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      data: JSON.stringify({ q: prefix+" \n"+inputText }),
      success: function(response) {
        let content = JSON.parse(response).choices[0].message.content;
        log("AI Response: ", content, "debug");
        if (!content.includes("{")) {
          log("AI Error: ", "No JSON found", "error");
          return;
        }
        json = content.substring(content.indexOf("{"), content.lastIndexOf("}")+1);
        log("JSON: ", json, "debug");
        try {
          json = JSON.parse(json);
        } catch (e) {
          log("JSON Error: ", e, "error");
          return;
        }
        callback(json);     
      },
      error: function(xhr, status, error) {
          log("AI Error: ", error, "error");
      }
  });
  }
});






function get_tables(html) {
  html = html.substring(html.indexOf('<div class="container-fluid">'));
  html = html.substring(0, html.lastIndexOf('</div>') + 6);

  res = "";
  sections = html.split('<h2>');
  for(section of sections) {
    if(section.trim() == "" || section.indexOf('</h2>') === -1) continue;
    tablename = section.substring(0, section.indexOf('</h2>'));
    
    section = section.substring(section.indexOf('<tbody>')+7);
    section = section.substring(0, section.indexOf('</tbody>'));
    
    columns = [];
    trs = section.split('<tr>');
    for(tr of trs) {
      if(tr.trim() == "" || tr.indexOf('</tr>') === -1) continue;
      tds = tr.split('<td');
      if(tds.length < 2) continue;
      column = tds[1].substring(tds[1].indexOf('>')+1, tds[1].indexOf('</td>'));
      column = column.replace(/<[^>]*>?/gm, '').trim();
      if(column.endsWith('(Primary)')) {
        column = column.substring(0, column.indexOf(' ')).trim();
        primary_key = true;
      } else {
        primary_key = false;
      }
      type = tds[2].substring(tds[2].indexOf('>')+1, tds[2].indexOf('</td>')).trim();
      columns.push(column + " " + type + (primary_key ? " PRIMARY KEY" : ""));
    }
    res += tablename+"("+ columns.join(", ") +");\n";
  }
  return res;
} 
