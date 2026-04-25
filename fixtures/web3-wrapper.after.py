from ape import chain


class ProviderProbe:
    def __init__(self, address):
        self.address = address

    def snapshot(self):
        block = chain.blocks[-1]
        return {
            "chain_id": chain.chain_id,
            "height": chain.blocks.height,
            "balance": chain.get_balance(self.address),
            "timestamp": block.timestamp,
        }
