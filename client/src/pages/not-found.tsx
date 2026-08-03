import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { PageLayout } from "@/components/layout";

export default function NotFound() {
  return (
    <PageLayout>
      <div className="flex-1 w-full flex items-center justify-center py-20">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              페이지를 찾을 수 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
