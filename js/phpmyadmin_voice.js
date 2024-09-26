DEBUG = true;

PHPMYADMIN_URL = "http://localhost/phpMyAdmin";
API_URL = "http://localhost/t63/crud-invaders/api.php";

PREFIX = "The MySQL database schema is the following: @@@SCHEMA@@@. Answer with a single JSON object with one field: query:... Nothing else! In this query field, write the SQL query for the following: ";

$(document).on('ready', function() {
  const recognition = speech_recognition();
  let tables = "";

  $("#voicebtn").remove();
  $("#voice_language").remove();

  $("#pma_navigation").append('<button class="btn btn-danger button" style="border-radius:50%; font-size:110px; z-index:99999; position:fixed; bottom:10px; left:10px; width:160px; height:160px; cursor:pointer;" id="voicebtn" onClick="clickVoiceBtn()">🎤</button>');
  $("#pma_navigation").append('<select id="voice_language" style="position:fixed; bottom:10px; left:160px; z-index:99999;"><option value="en-US">en-US</option><option value="de-DE">de-DE</option></select>');

  clickVoiceBtn = function() {
    if (recognition.recording) {
      recognition.recording = false;
      recognition.log("... stopped.", "", "log", true);
      recognition.stop();
      $('#voicebtn').text('🎤');
      return;
    }
    recognition.recording = true;
    recognition.lang = $('#voice_language').val();
    recognition.start();
    recognition.log("Listening...", "", "log", true);
    $('#voicebtn').text('◾');

    let dbname = $("input[name=db]").val();

    $.get(PHPMYADMIN_URL+"/index.php?route=/database/data-dictionary&db="+dbname, 
      function(data) { 
        tables = get_tables(data);
      });
    return false;
  };
  
  recognition.onend = function() {
    transcript = recognition.recorded_text.join(" ");
    if(transcript.trim() == "") {
      recognition.log("No transcript", "", "error");
      return;
    }
    recognition.log("Transcript: ", transcript);
    Functions.setQuery("-- "+transcript+"\n\n");
    recognition.recorded_text = [];
    use_ai(transcript, PREFIX.replace("@@@SCHEMA@@@", tables), function(json) {
      recognition.log("Query: ", json.query);
      $("#sqlquery").text(json.query);
      Functions.setQuery("-- "+transcript+"\n\n"+json.query);
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
