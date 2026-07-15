import { mount } from "svelte";
import App from "./App.svelte";
import "../../_shared/demo.css";

mount(App, { target: document.getElementById("app")! });
