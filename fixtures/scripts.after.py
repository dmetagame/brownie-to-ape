from ape import accounts, networks, project


def main():
    account = accounts.load("deployer")
    print(f"deploying on {networks.provider.network.name}")
    token = project.Token.deploy(sender=account)
    return token
