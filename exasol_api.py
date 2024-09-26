from flask import Flask, request
from flask_cors import CORS, cross_origin
import pyexasol
import json
import re

C = None

def all_tables():
  res = []
  stmt = C.execute("select TABLE_SCHEMA, TABLE_NAME, TABLE_ROW_COUNT from sys.exa_all_tables WHERE TABLE_ROW_COUNT>0 ORDER BY TABLE_SCHEMA, TABLE_NAME;")
  for row in stmt:
    res.append( { 'schema': row[0], 'table': row[1], 'row:count': row[2] } )
  return res

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/tables')
@cross_origin()
def get_tables():
  return json.dumps(all_tables())

@app.route('/query', methods=['POST'])
@cross_origin()
def db_query():
    res = []
    query = request.json['query']  # Direkter Zugriff auf das 'query'-Feld
    try:
      stmt = C.execute(query)
      for row in stmt:
        res.append(row)
    except pyexasol.ExaQueryError as e:
      return json.dumps({'error': str(e.message)})
    return json.dumps(res)

@app.route('/tables/<tables>')
@cross_origin()
def get_table(tables):
  res = []
  for tables in tables.split(','):
    schema, table = tables.split('.')
    res.append(table_columns(schema, table))
  return json.dumps(res)

def table_columns(schema, table):
  cols = []
  stmt = C.execute(f"select COLUMN_NAME from sys.exa_all_columns where COLUMN_SCHEMA='{schema}' and COLUMN_TABLE='{table}'")
  for row in stmt:
    cols.append(row[0])
  stmt = C.execute(f"select * from {schema}.{table} limit 1")
  res = []
  for row in stmt:
    res.append(dict(zip(cols, row)))
  res[0]['_schema'] = schema
  res[0]['_table'] = table
  return res[0]

def read_php_config(file_path):
    config = {}
    
    # Regular expression to match the PHP variables and their values
    pattern = re.compile(r'\$(\w+)\s*=\s*[\'"](.+?)[\'"];')
    
    with open(file_path, 'r') as file:
        for line in file:
            match = pattern.search(line)
            if match:
                key, value = match.groups()
                config[key] = value
    
    return config

if __name__ == '__main__':
  config = read_php_config('config.php')
  C = pyexasol.connect(dsn=config["EXASOL_HOST"], user=config["EXASOL_USER"], password=config["EXASOL_PASSWORD"])
  app.run()