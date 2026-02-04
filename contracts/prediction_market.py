# { "Depends": "py-genlayer:test" }
from genlayer import *
import json


class PredictionMarket(gl.Contract):
    """
    GenPredict - Crypto Price Prediction Market
    """
    
    # State variables with proper GenLayer types
    market_count: u256
    min_bet_amount: u256
    fee_rate: u256
    collected_fees: u256
    
    # Market data stored as JSON strings in TreeMap
    # Key: market_id (str), Value: market JSON data (str)
    market_data: TreeMap[str, str]
    
    # User bets: Key: user_address, Value: bets JSON string
    user_bet_data: TreeMap[str, str]
    
    def __init__(self):
        self.market_count = u256(0)
        self.min_bet_amount = u256(0)
        self.fee_rate = u256(100)  # 1%
        self.collected_fees = u256(0)
    
    @gl.public.write.payable
    def create_market(
        self,
        asset: str,
        condition: str,
        threshold: str,
        resolution_timestamp: str
    ) -> str:
        assert condition in ["above", "below"], "Condition must be 'above' or 'below'"
        assert len(asset) > 0, "Asset symbol required"
        
        self.market_count = u256(int(self.market_count) + 1)
        market_id = str(int(self.market_count))
        
        market = {
            "market_id": market_id,
            "creator": str(gl.message.sender_address),
            "asset": asset.upper(),
            "condition": condition,
            "threshold": threshold,
            "resolution_timestamp": resolution_timestamp,
            "yes_pool": "0",
            "no_pool": "0",
            "resolved": False,
            "outcome": "",
            "bettors": {}
        }
        
        self.market_data[market_id] = json.dumps(market)
        return market_id
    
    @gl.public.write.payable
    def place_bet(self, market_id: str, position: str) -> bool:
        assert market_id in self.market_data, "Market does not exist"
        
        market = json.loads(self.market_data[market_id])
        
        assert not market["resolved"], "Market already resolved"
        assert position in ["YES", "NO"], "Position must be 'YES' or 'NO'"
        
        bet_amount = int(gl.message.value)
        
        # Calculate fee
        fee = (bet_amount * int(self.fee_rate)) // 10000
        net_amount = bet_amount - fee
        self.collected_fees = u256(int(self.collected_fees) + fee)
        
        # Record bet
        bettor = str(gl.message.sender_address)
        if bettor not in market["bettors"]:
            market["bettors"][bettor] = {"YES": 0, "NO": 0}
        
        market["bettors"][bettor][position] += net_amount
        
        # Update pool
        if position == "YES":
            market["yes_pool"] = str(int(market["yes_pool"]) + net_amount)
        else:
            market["no_pool"] = str(int(market["no_pool"]) + net_amount)
        
        self.market_data[market_id] = json.dumps(market)
        
        # Track user bets
        user_bets = []
        if bettor in self.user_bet_data:
            user_bets = json.loads(self.user_bet_data[bettor])
        
        user_bets.append({
            "market_id": market_id,
            "position": position,
            "amount": net_amount
        })
        
        self.user_bet_data[bettor] = json.dumps(user_bets)
        
        return True
    
    @gl.public.write
    def resolve_market(self, market_id: str) -> str:
        assert market_id in self.market_data, "Market does not exist"
        
        market = json.loads(self.market_data[market_id])
        assert not market["resolved"], "Market already resolved"
        
        asset = market["asset"]
        threshold = float(market["threshold"])
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
            
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd"
            web_data = gl.get_webpage(url, mode="text")
            
            prompt = f"""
            Parse the price and determine outcome.
            
            API Response: {web_data}
            Asset: {asset}
            Condition: price {condition} ${threshold}
            
            Return ONLY JSON: {{"price": <number>, "outcome": "YES" or "NO"}}
            """
            
            result = gl.exec_prompt(prompt)
            return result
        
        result_str = gl.eq_principle_strict_eq(fetch_price)
        
        try:
            result = json.loads(result_str)
            outcome = result.get("outcome", "INVALID")
            
            market["resolved"] = True
            market["outcome"] = outcome
            market["resolution_price"] = str(result.get("price", 0))
            
            self.market_data[market_id] = json.dumps(market)
            
            return json.dumps({"market_id": market_id, "outcome": outcome})
            
        except Exception as e:
            market["resolved"] = True
            market["outcome"] = "INVALID"
            self.market_data[market_id] = json.dumps(market)
            return json.dumps({"market_id": market_id, "outcome": "INVALID", "error": str(e)})
    
    @gl.public.write
    def claim_winnings(self, market_id: str) -> str:
        assert market_id in self.market_data, "Market does not exist"
        
        market = json.loads(self.market_data[market_id])
        assert market["resolved"], "Market not resolved"
        assert market["outcome"] in ["YES", "NO"], "Invalid market outcome"
        
        bettor = str(gl.message.sender_address)
        assert bettor in market["bettors"], "No bets found"
        
        user_bets = market["bettors"][bettor]
        winning_position = market["outcome"]
        user_bet = user_bets.get(winning_position, 0)
        
        if user_bet == 0:
            return "0"
        
        total_pool = int(market["yes_pool"]) + int(market["no_pool"])
        winning_pool = int(market["yes_pool"]) if winning_position == "YES" else int(market["no_pool"])
        
        if winning_pool == 0:
            return "0"
        
        winnings = (user_bet * total_pool) // winning_pool
        
        # Reset user bets
        market["bettors"][bettor] = {"YES": 0, "NO": 0}
        self.market_data[market_id] = json.dumps(market)
        
        # Transfer winnings
        gl.transfer(gl.message.sender_address, u256(winnings))
        
        return str(winnings)
    
    @gl.public.view
    def get_market(self, market_id: str) -> str:
        if market_id not in self.market_data:
            return "{}"
        
        market = json.loads(self.market_data[market_id])
        # Remove bettors for privacy
        result = {k: v for k, v in market.items() if k != "bettors"}
        return json.dumps(result)
    
    @gl.public.view
    def get_all_market_ids(self) -> str:
        ids = []
        count = int(self.market_count)
        for i in range(1, count + 1):
            ids.append(str(i))
        return json.dumps(ids)
    
    @gl.public.view
    def get_market_odds(self, market_id: str) -> str:
        if market_id not in self.market_data:
            return json.dumps({"error": "Market not found"})
        
        market = json.loads(self.market_data[market_id])
        
        yes_pool = int(market["yes_pool"])
        no_pool = int(market["no_pool"])
        total = yes_pool + no_pool
        
        if total == 0:
            return json.dumps({"yes_probability": 50, "no_probability": 50, "total_pool": 0})
        
        return json.dumps({
            "yes_probability": (yes_pool * 100) // total,
            "no_probability": (no_pool * 100) // total,
            "yes_pool": yes_pool,
            "no_pool": no_pool,
            "total_pool": total
        })
    
    @gl.public.view
    def get_user_position(self, market_id: str, user_address: str) -> str:
        if market_id not in self.market_data:
            return json.dumps({"YES": 0, "NO": 0})
        
        market = json.loads(self.market_data[market_id])
        
        if user_address not in market["bettors"]:
            return json.dumps({"YES": 0, "NO": 0})
        
        return json.dumps(market["bettors"][user_address])
    
    @gl.public.view
    def get_stats(self) -> str:
        total_volume = 0
        active_count = 0
        resolved_count = 0
        
        count = int(self.market_count)
        for i in range(1, count + 1):
            market_id = str(i)
            if market_id in self.market_data:
                market = json.loads(self.market_data[market_id])
                total_volume += int(market["yes_pool"]) + int(market["no_pool"])
                if market["resolved"]:
                    resolved_count += 1
                else:
                    active_count += 1
        
        return json.dumps({
            "total_markets": int(self.market_count),
            "active_markets": active_count,
            "resolved_markets": resolved_count,
            "total_volume": total_volume,
            "collected_fees": int(self.collected_fees)
        })
