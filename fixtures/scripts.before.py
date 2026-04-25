from brownie import Token, accounts, config, network


def main():
    account = accounts.load(config["wallets"]["from_key"])
    print(f"deploying on {network.show_active()}")
    token = Token.deploy({"from": account}, publish_source=True)
    return token
