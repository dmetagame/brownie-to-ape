from ape import Project, accounts


def main(path="./external/vaults"):
    external = Project(path)
    deployer = accounts.load("deployer")
    vault = external.Vault.deploy(sender=deployer)
    # TODO(brownie-to-ape): run this script with `ape run scripts/initialize.py`.
    # TODO(brownie-to-ape): Ape Project(path) objects do not require Brownie project.close().
    return vault
