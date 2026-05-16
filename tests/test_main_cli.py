from src.llm.llm_explainer import ExplanationResult


def test_main_smoke_path_does_not_require_ollama(monkeypatch, tmp_path):
    import main

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        main,
        "generate_explanation_result",
        lambda prompt: ExplanationResult(
            available=False,
            content="",
            error="offline",
            model="phi3:mini",
        ),
    )

    main.main()

    assert (tmp_path / "reports" / "drift_report.csv").exists()
