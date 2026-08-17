import json
import traceback
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from bot_engine import analyze_otc_candles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # оставлено как раньше
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
            try:
                raw = await websocket.receive_text()
            except Exception as e:
                # If receiving text fails, break loop (client closed)
                print(f"[!] Ошибка при чтении WebSocket: {e}")
                break

            try:
                candles = json.loads(raw)
            except Exception as e:
                # invalid JSON; return WAIT response
                err_msg = f"Invalid JSON payload: {str(e)}"
                print("[!] " + err_msg)
                await websocket.send_json({"signal": "WAIT", "direction": "NEUTRAL", "reason": err_msg})
                continue

            try:
                result = analyze_otc_candles(candles)
                # ensure JSON serializable (convert numpy types)
                # Send safe keys
                safe = {}
                for k, v in (result.items() if isinstance(result, dict) else []):
                    try:
                        json.dumps({k: v})
                        safe[k] = v
                    except Exception:
                        # fallback to string
                        safe[k] = str(v)
                if not safe:
                    safe = {"signal": "WAIT", "direction": "NEUTRAL", "reason": "Empty analysis result"}
                await websocket.send_json(safe)
            except Exception as e:
                tb = traceback.format_exc()
                print("[!] Ошибка анализа/отправки: ", e, tb)
                try:
                    await websocket.send_json({"signal": "WAIT", "direction": "NEUTRAL", "reason": f"Server error: {str(e)}"})
                except Exception:
                    pass

    except WebSocketDisconnect:
        print("[-] Веб-интерфейс отключился")
    except Exception as e:
        print(f"[!] Внешняя ошибка сокета: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
        print("[*] WebSocket session finished")
