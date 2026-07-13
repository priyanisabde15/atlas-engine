fn main() {
    let target = std::env::var("TARGET").unwrap();
    println!("cargo:rustc-env=TAURI_ENV_TARGET_TRIPLE={}", target);
    println!("cargo:rustc-cfg=desktop");
}
