"""Small example used by <code src> in demo.md."""

from functools import lru_cache


@lru_cache(maxsize=None)
def fib(n: int) -> int:
    """n-th Fibonacci number."""
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


def main() -> None:
    for i in range(10):
        print(i, fib(i))


if __name__ == "__main__":
    main()
