import PageManager from "../../theme/page-manager";

export default class ProductData extends PageManager {
  constructor(context) {
    super(context);
    console.log("Context:", context);
    this.accesstoken = context.credential;
    this.proId = context.productId;
  }

  onReady() {
    this.getCustomFields();
  }

  getCustomFields() {
    console.log("Access token:", this.accesstoken);
    console.log("Product ID:", this.proId);

    fetch("/graphql", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accesstoken}`,
      },
      body: JSON.stringify({
        query: `
          query {
            site {
              product(entityId: ${this.proId}) {
                customFields {
                  edges {
                    node {
                      name
                      value
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const customFields = data.data.site.product.customFields.edges.map(
          (edge) => ({
            name: edge.node.name,
            value: edge.node.value,
          })
        );

        console.log("Custom Fields:", customFields);

        const skuField = customFields.find(
          (field) => field.name.toLowerCase() === "sku"
        );

        if (skuField) {
          console.log("SKU Field Found:", skuField.value);

          const skuArray = skuField.value.split(",").map((sku) => sku.trim());

          console.log("Split SKUs:", skuArray);

          skuArray.forEach((sku) => {
            if (sku) {
              this.fetchProductDetails(sku);
            }
          });
        } else {
          console.log("SKU field not found in custom fields.");
        }
      })
      .catch((error) => console.error("Error fetching custom fields:", error));
  }

  fetchProductDetails(sku) {
    fetch("/graphql", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accesstoken}`,
      },
      body: JSON.stringify({
        query: `
          query {
            site {
              product(sku: "${sku}") {
                entityId
                name
                prices {
                  price {
                    formatted
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      urlOriginal
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("data", data);
  
        const product = data.data.site.product;
  
        if (product) {
          const { entityId, name, prices, images } = product;
  
          const price =
            prices && prices.price.formatted ? prices.price.formatted : "N/A";
          const imageUrl =
            images && images.edges.length > 0
              ? images.edges[0].node.urlOriginal
              : "default-image.jpg";
  
          const productContainer = document.getElementById("product-container");
  
          const productElement = document.createElement("div");
          productElement.classList.add("product-container");
  
          productElement.innerHTML = `
            <div class="product-title">${name}</div>
            <div class="product-price">${price}</div>
            <div class="product-image-div">
              <img src="${imageUrl}" alt="${name}" />
            </div>
            <div class="add-to-cart-button">
              <button onclick="window.location.href='/cart.php?action=add&product_id=${entityId}';">Add to Cart</button>
            </div>
          `;
  
          productContainer.appendChild(productElement);
        } else {
          console.log(`No product found for SKU: ${sku}`);
        }
      })
      .catch((error) => {
        console.error("Error during GraphQL fetch for SKU:", sku, error);
      });
  }
  
}
