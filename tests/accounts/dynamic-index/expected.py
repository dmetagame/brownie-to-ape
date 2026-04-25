from ape import accounts


def get_account(index=None):
    if index is not None:
        return accounts.test_accounts[index]
    return accounts.test_accounts[0]
