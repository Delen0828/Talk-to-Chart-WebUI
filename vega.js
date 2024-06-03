function renderVegaLite() {
    const spec = document.getElementById('vega-lite-code').value;
    const visContainer = document.getElementById('vis');
    try {
      const vegaLiteSpec = JSON.parse(spec);
      vegaEmbed(visContainer, vegaLiteSpec);
    } catch (error) {
      visContainer.innerHTML = `<p style="color: red;">Error rendering chart: ${error.message}</p>`;
    }
  }

function reRenderVegaLite(spec) {
  const visContainer = document.getElementById('vis');
  try {
    // const vegaLiteSpec = JSON.parse(spec);
    vegaEmbed(visContainer, spec);
  } catch (error) {
    visContainer.innerHTML = `<p style="color: red;">Error rendering chart: ${error.message}</p>`;
  }
}