"""
Supabase 마이그레이션 실행 스크립트

사용법:
  1. Supabase Dashboard → SQL Editor에서 직접 실행
  2. 또는 DB_PASSWORD 환경변수 설정 후 이 스크립트 실행:
     DB_PASSWORD=your_password python scripts/run_migrations.py

마이그레이션 파일:
  - supabase/migrations/001_initial.sql  (테이블, 인덱스, RLS, Storage)
  - supabase/migrations/002_seed_templates.sql  (식품/패션 템플릿 시드)
"""

import os
import sys

PROJECT_REF = "vphfowdnhjvefahkzkmg"

def print_manual_instructions():
    print("=" * 60)
    print("Supabase SQL Editor에서 마이그레이션을 실행하세요")
    print("=" * 60)
    print()
    print("1. https://supabase.com/dashboard/project/{}/sql/new".format(PROJECT_REF))
    print("   에 접속합니다.")
    print()
    print("2. 다음 파일의 내용을 순서대로 복사하여 실행합니다:")
    print("   - supabase/migrations/001_initial.sql")
    print("   - supabase/migrations/002_seed_templates.sql")
    print()
    print("3. 실행 후 Tables 탭에서 templates, projects,")
    print("   project_images 테이블이 생성되었는지 확인합니다.")
    print()
    print("4. templates 테이블에 '식품 프로모션'과 '패션 룩북'")
    print("   두 개의 레코드가 있는지 확인합니다.")
    print("=" * 60)


def try_psql():
    db_password = os.environ.get("DB_PASSWORD")
    if not db_password:
        return False

    import subprocess

    conn_str = f"postgresql://postgres.{PROJECT_REF}:{db_password}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

    migrations = [
        "supabase/migrations/001_initial.sql",
        "supabase/migrations/002_seed_templates.sql",
    ]

    for migration in migrations:
        if not os.path.exists(migration):
            print(f"파일을 찾을 수 없습니다: {migration}")
            return False

        print(f"실행 중: {migration}")
        result = subprocess.run(
            ["psql", conn_str, "-f", migration],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"오류: {result.stderr}")
            return False
        print(f"완료: {migration}")
        print(result.stdout[:500])

    return True


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    if not try_psql():
        print_manual_instructions()
        sys.exit(1)

    print("\n마이그레이션이 완료되었습니다!")
