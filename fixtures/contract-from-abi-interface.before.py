from brownie import Contract, interface


def get_tokens(vault_address, token_address, erc20_abi):
    vault = Contract.from_abi("Vault", vault_address, erc20_abi)
    token = interface.IERC20(token_address)
    return vault, token
