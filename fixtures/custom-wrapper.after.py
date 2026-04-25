from ape import Contract, accounts, networks


class ApeVaultHandle:
    def __init__(self, address, alias="keeper"):
        self.vault = Contract(address)
        self.keeper = accounts.load(alias)

    def harvest(self):
        print(f"harvesting on {networks.provider.network.name}")
        return self.vault.harvest(sender=self.keeper)
