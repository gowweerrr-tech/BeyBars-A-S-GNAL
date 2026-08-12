import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from bot_engine import analyze_otc_candles

app = FastAPI()

# Разрешаем подключение с вашего фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Server is running"}

@app.websocket("/ws/signals")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[+] Веб-интерфейс успешно подключился по WebSocket")
    
    try:
        while True:
            # Принимаем свечи от браузера или парсера в формате JSON
            raw_data = await websocket.receive_text()
            candles = json.loads(raw_data)
            
            # Просчитываем индикаторы через bot_engine.py
            analysis_result = analyze_otc_candles(candles)
            
            # Отправляем результат обратно в интерфейс
            await websocket.send_json(analysis_result)
            
    except WebSocketDisconnect:
        print("[-] Веб-интерфейс отключился")
    except Exception as e:
        print(f"[!] Ошибка обработки данных: {e}")
