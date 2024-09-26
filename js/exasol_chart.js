DEBUG = true;

PREFIX_PROMPT_GET_TABLES = "These tables are in the Exasol database: @@@TABLES@@@. Choose all candidates for tables which can be helpful to answer the user query. Better is choosing too many than too few. Answer with a JSON that only contains the array field tables:[...], nothing else! Here is the user question: ";
PREFIX_PROMPT_GET_QUERY = "We want to create a chart from data of an Exasol database. The tables that can be used are: @@@TABLES@@@. Please answer with a JSON with one single field query: with the valid SQL query, nothing else. Mind that schema names must always be used before table names and sort and limit the result to make the diagram as good as possible. The user question is: ";
PREFIX_PROMPT_GET_CHART = "We want to use Highchart.JS to create a chart for the following query @@@QUERY@@@. The result of this query is: @@@RESULT@@@. Please answer with a JSON that we can use for the second argument of the Highcharts.chart method. Nothing else should be part of the answer! The data should be directly embedded in that field. Choose the best-fitting diagram type. The user question is: ";

$(window).on("load",function() {
  $.ajax({
    url: "http://127.0.0.1:5000/tables",
    type: 'GET',
    success: function(response) {
      let tables = [];
      for(table of JSON.parse(response)) {
        tables.push(table.schema+"."+table.table);
      }
      $('#all_tables').val(tables.join(", "));
    }});
});

$('#query_form').on('submit', function() {
  let question = document.getElementById("question").value;
  use_ai(question, PREFIX_PROMPT_GET_TABLES.replace("@@@TABLES@@@", $('#all_tables').val()), function(json) {
    let tables = json.tables.join(",");
    $.ajax({
      url: "http://127.0.0.1:5000/tables/"+encodeURIComponent(tables),
      type: 'GET',
      success: function(response) {
        let table_data = response;
        use_ai(question, PREFIX_PROMPT_GET_QUERY.replace("@@@TABLES@@@", table_data), function(json) {
          $('#query').text(json.query);

          $.ajax({
            url: "http://127.0.0.1:5000/query",
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ query: json.query }),  // Send the query as JSON in the request body
            success: function(response) {        
              use_ai(question, PREFIX_PROMPT_GET_CHART.replace("@@@QUERY@@@", json.query).replace("@@@RESULT@@@", response), function(json) {
                Highcharts.chart("chart", json);
              });
            }});
          
        });
      }});
  });
});