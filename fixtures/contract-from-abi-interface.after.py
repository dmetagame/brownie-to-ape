from ape import Contract, project


def get_tokens(vault_address, token_address, erc20_abi):
    vault = Contract(vault_address, contract_type=erc20_abi)
    token = project.IERC20.at(token_address)
    return vault, token
