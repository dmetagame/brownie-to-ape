from brownie import Contract, accounts, network


class BrownieVaultHandle:
    def __init__(self, address, alias="keeper"):
        self.vault = Contract.at(address)
        self.keeper = accounts.load(alias)

    def harvest(self):
        print(f"harvesting on {network.show_active()}")
        return self.vault.harvest({"from": self.keeper})
