# { "Depends": "py-genlayer:test" }
from genlayer import *
import json
from datetime import datetime


class PredictionMarket(gl.Contract):
    """
    GenPredict - Crypto Price Prediction Market
    
    A decentralized prediction market for cryptocurrency prices.
    Users can create markets, place bets, and get automatic resolution
    via AI-powered price verification.
    """
    
    market_count: int
    markets: dict[int, dict]
    user_bets: dict[str, list]
    min_bet_amount: int
    fee_rate: int
    collected_fees: int
    
    def __init__(self):
        self.market_count = 0
        self.markets = {}
        self.user_bets = {}
        self.min_bet_amount = 0
        self.fee_rate = 100
        self.collected_fees = 0
    
    @gl.public.write.payable
    def create_market(
        self,
        asset: str,
        condition: str,
        threshold: float,
        resolution_timestamp: int
    ) -> int:
        assert condition in ["above", "below"], "Condition must be 'above' or 'below'"
        assert resolution_timestamp > int(datetime.now().timestamp()), "Resolution time must be in the future"
        assert len(asset) > 0, "Asset symbol required"
        assert threshold > 0, "Threshold must be positive"
        
        self.market_count += 1
        market_id = self.market_count
        
        self.markets[market_id] = {
            "market_id": market_id,
            "creator": str(gl.message.sender),
            "asset": asset.upper(),
            "condition": condition,
            "threshold": threshold,
            "resolution_timestamp": resolution_timestamp,
            "yes_pool": 0,
            "no_pool": 0,
            "resolved": False,
            "outcome": "",
            "created_at": int(datetime.now().timestamp()),
            "bettors": {}
        }
        
        return market_id
    
    @gl.public.write.payable
    def place_bet(self, market_id: int, position: str) -> bool:
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        
        assert not market["resolved"], "Market already resolved"
        assert int(datetime.now().timestamp()) < market["resolution_timestamp"], "Market expired"
        assert position in ["YES", "NO"], "Position must be 'YES' or 'NO'"
        
        bet_amount = gl.message.value
        assert bet_amount >= self.min_bet_amount, "Bet amount too low"
        
        fee = (bet_amount * self.fee_rate) // 10000
        net_amount = bet_amount - fee
        self.collected_fees += fee
        
        bettor = str(gl.message.sender)
        if bettor not in market["bettors"]:
            market["bettors"][bettor] = {"YES": 0, "NO": 0}
        
        market["bettors"][bettor][position] += net_amount
        
        if position == "YES":
            market["yes_pool"] += net_amount
        else:
            market["no_pool"] += net_amount
        
        if bettor not in self.user_bets:
            self.user_bets[bettor] = []
        
        self.user_bets[bettor].append({
            "market_id": market_id,
            "position": position,
            "amount": net_amount,
            "timestamp": int(datetime.now().timestamp())
        })
        
        return True
    
    @gl.public.write
    def resolve_market(self, market_id: int) -> dict:
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        
        assert not market["resolved"], "Market already resolved"
        assert int(datetime.now().timestamp()) >= market["resolution_timestamp"], "Market not yet expired"
        
        asset = market["asset"]
        threshold = market["threshold"]
        condition = market["condition"]
        
        def fetch_price():
            coin_id = "bitcoin"
            if asset.upper() == "ETH":
                coin_id = "ethereum"
            elif asset.upper() == "SOL":
                coin_id = "solana"
            elif asset.upper() == "BNB":
                coin_id = "binancecoin"
            elif asset.upper() == "XRP":
                coin_id = "ripple"
            elif asset.upper() == "ADA":
                coin_id = "cardano"
            elif asset.upper() == "DOGE":
                coin_id = "dogecoin"
            elif asset.upper() == "DOT":
                coin_id = "polkadot"
            elif asset.upper() == "MATIC":
                coin_id = "matic-network"
            elif asset.upper() == "LINK":
                coin_id = "chainlink"
            
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd"
            web_data = gl.get_webpage(url, mode="text")
            
            prompt = f"""
            Parse the price data and determine the market outcome.
            
            API Response: {web_data}
            Asset: {asset}
            Condition: price {condition} ${threshold}
            
            Extract the USD price and check if condition is met.
            
            Return ONLY valid JSON:
            {{"price": <number>, "outcome": "YES" or "NO", "reasoning": "<one sentence>"}}
            """
            
            result = gl.exec_prompt(prompt)
            return result
        
        result_str = gl.eq_principle_strict_eq(fetch_price)
        
        try:
            result = json.loads(result_str)
            outcome = result.get("outcome", "INVALID")
            price = result.get("price", 0)
            
            market["resolved"] = True
            market["outcome"] = outcome
            market["resolution_price"] = price
            
            return {
                "market_id": market_id,
                "outcome": outcome,
                "price": price,
                "reasoning": result.get("reasoning", "")
            }
            
        except Exception as e:
            market["resolved"] = True
            market["outcome"] = "INVALID"
            return {"market_id": market_id, "outcome": "INVALID", "error": str(e)}
    
    @gl.public.write
    def claim_winnings(self, market_id: int) -> int:
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        
        assert market["resolved"], "Market not resolved"
        assert market["outcome"] in ["YES", "NO"], "Invalid market outcome"
        
        bettor = str(gl.message.sender)
        assert bettor in market["bettors"], "No bets found"
        
        user_bets = market["bettors"][bettor]
        winning_position = market["outcome"]
        user_bet = user_bets.get(winning_position, 0)
        
        if user_bet == 0:
            return 0
        
        total_pool = market["yes_pool"] + market["no_pool"]
        winning_pool = market["yes_pool"] if winning_position == "YES" else market["no_pool"]
        
        if winning_pool == 0:
            return 0
        
        winnings = (user_bet * total_pool) // winning_pool
        market["bettors"][bettor] = {"YES": 0, "NO": 0}
        gl.transfer(gl.message.sender, winnings)
        
        return winnings
    
    @gl.public.view
    def get_market(self, market_id: int) -> dict:
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id].copy()
        if "bettors" in market:
            del market["bettors"]
        return market
    
    @gl.public.view
    def get_all_markets(self) -> list:
        result = []
        for market_id, market in self.markets.items():
            m = market.copy()
            if "bettors" in m:
                del m["bettors"]
            result.append(m)
        return result
    
    @gl.public.view
    def get_active_markets(self) -> list:
        current_time = int(datetime.now().timestamp())
        result = []
        for market_id, market in self.markets.items():
            if not market["resolved"] and market["resolution_timestamp"] > current_time:
                m = market.copy()
                if "bettors" in m:
                    del m["bettors"]
                result.append(m)
        return result
    
    @gl.public.view
    def get_user_bets(self, user_address: str) -> list:
        return self.user_bets.get(user_address, [])
    
    @gl.public.view
    def get_user_position(self, market_id: int, user_address: str) -> dict:
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        if user_address not in market["bettors"]:
            return {"YES": 0, "NO": 0}
        return market["bettors"][user_address]
    
    @gl.public.view
    def get_market_odds(self, market_id: int) -> dict:
        assert market_id in self.markets, "Market does not exist"
        market = self.markets[market_id]
        
        yes_pool = market["yes_pool"]
        no_pool = market["no_pool"]
        total = yes_pool + no_pool
        
        if total == 0:
            return {"yes_probability": 50, "no_probability": 50}
        
        return {
            "yes_probability": (yes_pool * 100) // total if total > 0 else 50,
            "no_probability": (no_pool * 100) // total if total > 0 else 50,
            "yes_pool": yes_pool,
            "no_pool": no_pool,
            "total_pool": total
        }
    
    @gl.public.view
    def get_stats(self) -> dict:
        total_volume = 0
        active_count = 0
        resolved_count = 0
        current_time = int(datetime.now().timestamp())
        
        for market in self.markets.values():
            total_volume += market["yes_pool"] + market["no_pool"]
            if market["resolved"]:
                resolved_count += 1
            elif market["resolution_timestamp"] > current_time:
                active_count += 1
        
        return {
            "total_markets": self.market_count,
            "active_markets": active_count,
            "resolved_markets": resolved_count,
            "total_volume": total_volume,
            "collected_fees": self.collected_fees
        }
