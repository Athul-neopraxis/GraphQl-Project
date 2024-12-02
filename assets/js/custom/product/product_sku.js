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
          console.log("SKU Field:", skuField.value);

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
                description
                prices {
                  price {
                    formatted
                  }
                }
                images(first: 4) {
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
          const { entityId, name, prices, images, description } = product;

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
              <img src="${imageUrl}" alt="${name}" id="main-image" />
            </div>
            <div class="small-image-container">
            </div>
            <div class="product-buttons">
              <div class="add-to-cart-button">
                <button onclick="window.location.href='/cart.php?action=add&product_id=${entityId}';">Add to Cart</button>
              </div>
              <div class="view-more-button">
                <button class="view-more-btn" data-product-id="${entityId}">View More</button>
              </div>
            </div>
          `;

          productContainer.appendChild(productElement);

          const smallImageContainer = productElement.querySelector(
            ".small-image-container"
          );

          if (images && images.edges.length > 0) {
            images.edges.forEach((imageEdge) => {
              const smallImageUrl = imageEdge.node.urlOriginal;
              const smallImageDiv = document.createElement("div");
              smallImageDiv.classList.add("small-images");
              smallImageDiv.innerHTML = `<img src="${smallImageUrl}" style="width:100%; max-width: 80px; height:40px" />`;
              smallImageContainer.appendChild(smallImageDiv);

              smallImageDiv
                .querySelector("img")
                .addEventListener("click", function () {
                  const mainImage = productElement.querySelector("#main-image");
                  mainImage.src = smallImageUrl;
                  mainImage.alt = name;
                });
            });
          }

          const viewMoreButton = productElement.querySelector(".view-more-btn");
          viewMoreButton.addEventListener("click", () => {
            this.showProductModal(name, description, price, imageUrl);
          });
        } else {
          console.log(`No product found for SKU: ${sku}`);
        }
      })
      .catch((error) => {
        console.error("Error during GraphQL fetch for SKU:", sku, error);
      });
  }

  showProductModal(name, description, price, imageUrl) {
    const modal = document.getElementById("product-modal");
    const modalDetails = document.getElementById("modal-product-details");
    console.log("modal:", modal);

    modalDetails.innerHTML = `
      <h2>${name}</h2>
      <p>${description || "No description available."}</p>
      <p><strong>Price:</strong> ${price}</p>
      <img src="${imageUrl}" alt="${name}" style="width:100%; max-width: 250px;" />
      <button class="close">&times;</button> <!-- Close button -->
    `;
    modal.style.display = "block";

    const closeModalButton = modalDetails.querySelector(".close");
    closeModalButton.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }
}
