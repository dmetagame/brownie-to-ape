from ape import Contract, accounts, project


def main():
    deployer = accounts.load("deployer")
    token = project.Token.deploy("Demo", "DME", 18, sender=deployer)
    registry = Contract("0x0000000000000000000000000000000000000001")
    token.transfer(registry, 1_000, sender=deployer)
    return token
