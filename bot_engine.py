import pandas as pd
import pandas_ta as ta
import math

def _is_valid_number(x):
    try:
        if x is None: return False
        if isinstance(x, float) and math.isnan(x): return False
        return True
    except Exception:
        return False

def analyze_otc_candles(candles_data):
    """
    Принимает список свечей OTC: [{'close': 1.0850, ...}, ...]
    Возвращает рассчитанный сигнал на основе RSI и EMA.
    """
    try:
        df = pd.DataFrame(candles_data)
        # Ensure 'close' exists
        if 'close' not in df.columns:
            return {"signal": "WAIT", "direction": "NEUTRAL", "reason": "Нет данных close"}
        # Need at least 20 candles
        if len(df) < 20:
            return {"signal": "WAIT", "direction": "NEUTRAL", "reason": "Мало свечей для анализа (нужно от 20)"}

        # ensure numeric
        df['close'] = pd.to_numeric(df['close'], errors='coerce')

        # Calculate indicators
        df['RSI'] = ta.rsi(df['close'], length=14)
        df['EMA_9'] = ta.ema(df['close'], length=9)
        df['EMA_21'] = ta.ema(df['close'], length=21)

        # take last values (guard against NaN)
        last_idx = df['close'].last_valid_index()
        if last_idx is None or last_idx < 1:
            return {"signal": "WAIT", "direction": "NEUTRAL", "reason": "Недостаточно валидных данных"}

        # get last non-NaN values for indicators
        last_rsi = df['RSI'].dropna().iloc[-1] if not df['RSI'].dropna().empty else None
        ema9_series = df['EMA_9'].dropna()
        ema21_series = df['EMA_21'].dropna()

        if ema9_series.empty or ema21_series.empty or last_rsi is None:
            return {"signal": "WAIT", "direction": "NEUTRAL", "reason": "Индикаторы не рассчитаны (недостаточно данных)"}

        last_ema9 = ema9_series.iloc[-1]
        last_ema21 = ema21_series.iloc[-1]

        # previous values (if available)
        try:
            prev_ema9 = ema9_series.iloc[-2]
            prev_ema21 = ema21_series.iloc[-2]
        except Exception:
            prev_ema9 = None
            prev_ema21 = None

        # ensure numeric
        if not _is_valid_number(last_rsi) or not _is_valid_number(last_ema9) or not _is_valid_number(last_ema21):
            return {"signal": "WAIT", "direction": "NEUTRAL", "reason": "Некорректные значения индикаторов"}

        # BUY signal
        if last_rsi < 30 and prev_ema9 is not None and prev_ema21 is not None and prev_ema9 < prev_ema21 and last_ema9 > last_ema21:
            return {
                "signal": "CALL",
                "direction": "UP",
                "rsi": round(float(last_rsi), 2),
                "reason": "RSI в зоне перепроданности + бычье пересечение EMA"
            }

        # SELL signal
        if last_rsi > 70 and prev_ema9 is not None and prev_ema21 is not None and prev_ema9 > prev_ema21 and last_ema9 < last_ema21:
            return {
                "signal": "PUT",
                "direction": "DOWN",
                "rsi": round(float(last_rsi), 2),
                "reason": "RSI в зоне перекупленности + медвежье пересечение EMA"
            }

        # Otherwise WAIT
        return {
            "signal": "WAIT",
            "direction": "NEUTRAL",
            "rsi": round(float(last_rsi), 2) if _is_valid_number(last_rsi) else None,
            "reason": "Нет четкого сетапа"
        }
    except Exception as e:
        # Return safe result on error
        return {"signal": "WAIT", "direction": "NEUTRAL", "reason": f"Ошибка анализа: {str(e)}"}
