import r2wc from "@r2wc/react-to-web-component";
import Element from "./Element";
import ReactDOM from "react-dom/client";
import React from "react";

// Convert React component to web component and register it
const WebElement = r2wc(Element, React, ReactDOM, {
  props: {
    // Define any props you want to be configurable via attributes here
    // e.g. theme: "string"
  },
});

// Register as custom element
customElements.define("settings-check-element", WebElement);
