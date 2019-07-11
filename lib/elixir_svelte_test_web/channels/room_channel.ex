defmodule ElixirSvelteTestWeb.RoomChannel do
  use ElixirSvelteTestWeb, :channel

  def join(channel_name, _params, socket) do
    {:ok, %{channel: channel_name}, socket}
  end
end
