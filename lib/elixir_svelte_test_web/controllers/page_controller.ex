defmodule ElixirSvelteTestWeb.PageController do
  use ElixirSvelteTestWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
