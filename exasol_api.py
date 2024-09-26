from flask import Flask
import pyexasol
import json

C = pyexasol.connect(dsn='10.127.0.33', user='API', password='APIabq7')

def all_tables():
  res = []
  stmt = C.execute("select TABLE_SCHEMA, TABLE_NAME, TABLE_ROW_COUNT from sys.exa_all_tables WHERE TABLE_ROW_COUNT>0;")
  for row in stmt:
    res.append( { 'schema': row[0], 'table': row[1], 'row:count': row[2] } )
  return res

app = Flask(__name__)

@app.route('/tables')
def get_tables():
  return json.dumps(all_tables())

@app.route('/tables/<schema>/<table>')
def get_table(schema, table):
  cols = []
  stmt = C.execute(f"select COLUMN_NAME from sys.exa_all_columns where COLUMN_SCHEMA='{schema}' and COLUMN_TABLE='{table}'")
  for row in stmt:
    cols.append(row[0])
  stmt = C.execute(f"select * from {schema}.{table} limit 1")
  res = []
  for row in stmt:
    res.append(dict(zip(cols, row)))
  return json.dumps(res[0])

if __name__ == '__main__':
  print(all_tables())
  app.run()



