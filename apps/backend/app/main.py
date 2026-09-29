from fastapi import FastAPI

app = FastAPI(title='SimpleGrow API')

@app.get('/')
def root():
    return {'status':'SimpleGrow API running'}
