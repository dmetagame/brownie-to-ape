from brownie import accounts, project, run


def main(path="./external/vaults"):
    external = project.load(path)
    deployer = accounts.load("deployer")
    vault = external.Vault.deploy({"from": deployer})
    run("scripts/initialize.py")
    project.close(external)
    return vault
