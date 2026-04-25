from brownie import chain, web3


class ProviderProbe:
    def __init__(self, address):
        self.address = address

    def snapshot(self):
        block = web3.eth.get_block("latest")
        return {
            "chain_id": web3.eth.chain_id,
            "height": chain.height,
            "balance": web3.eth.get_balance(self.address),
            "timestamp": block.timestamp,
        }
