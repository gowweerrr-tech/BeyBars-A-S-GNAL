import pandas as pd
import pandas_ta as ta

def analyze_otc_candles(candles_data):
    """
    Принимает список свечей OTC: [{'close': 1.0850, ...}, ...]
    Возвращает рассчитанный сигнал на основе RSI и EMA.
    """
    df = pd.DataFrame(candles_data)
    
    # Для базового анализа нужно хотя бы 20 свечей
    if len(df) < 20:
        return {"signal": "WAIT", "reason": "Мало свечей для анализа (нужно от 20)"}

    # Расчет индикаторов
    df['RSI'] = ta.rsi(df['close'], length=14)
    df['EMA_9'] = ta.ema(df['close'], length=9)
    df['EMA_21'] = ta.ema(df['close'], length=21)

    # Берем последние значения
    last_rsi = df['RSI'].iloc[-1]
    last_ema9 = df['EMA_9'].iloc[-1]
    last_ema21 = df['EMA_21'].iloc[-1]
    prev_ema9 = df['EMA_9'].iloc[-2]
    prev_ema21 = df['EMA_21'].iloc[-2]

    # Сигнал на покупку (CALL / UP)
    if last_rsi < 30 and prev_ema9 < prev_ema21 and last_ema9 > last_ema21:
        return {
            "signal": "CALL", 
            "direction": "UP", 
            "rsi": round(float(last_rsi), 2),
            "reason": "RSI в зоне перепроданности + бычье пересечение EMA"
        }
    
    # Сигнал на продажу (PUT / DOWN)
    elif last_rsi > 70 and prev_ema9 > prev_ema21 and last_ema9 < last_ema21:
        return {
            "signal": "PUT", 
            "direction": "DOWN", 
            "rsi": round(float(last_rsi), 2),
            "reason": "RSI в зоне перекупленности + медвежье пересечение EMA"
        }

    # Ожидание
    return {
        "signal": "WAIT", 
        "direction": "NEUTRAL", 
        "rsi": round(float(last_rsi), 2),
        "reason": "Нет четкого сетапа"
    }
  
