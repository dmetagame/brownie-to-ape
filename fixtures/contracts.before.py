from brownie import Contract, Token, accounts


def main():
    deployer = accounts.load("deployer")
    token = Token.deploy("Demo", "DME", 18, {"from": deployer})
    registry = Contract.at("0x0000000000000000000000000000000000000001")
    token.transfer(registry, 1_000, {"from": deployer})
    return token
