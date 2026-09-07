export function redirectIfCheckout(data: { checkoutUrl?: string | null }) {
  if (data.checkoutUrl) {
    window.location.assign(data.checkoutUrl);
    return true;
  }
  return false;
}
