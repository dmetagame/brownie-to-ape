from ape import chain, networks


def main():
    active = networks.provider.network.name
    print(f"{active}:{chain.chain_id}:{chain.blocks.height}")
    if active != "mainnet":
        with networks.ethereum.mainnet.use_default_provider():
            print(f"connected:{networks.provider.network.name}")
    return active
