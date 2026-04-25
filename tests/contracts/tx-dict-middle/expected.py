from ape import project


def deploy(account, oracle, fee, link_token):
    return project.APIConsumer.deploy(
        oracle,
        sender=account, gas_limit=1_000_000,
        fee,
        link_token,
    )
